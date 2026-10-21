import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { GoogleGenAI, GenerateVideosOperation, Modality, LiveServerMessage } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Parse port from environment or CLI flags (--port 3000)
const cliArgs = process.argv.slice(2);
const portIndex = cliArgs.indexOf('--port');
const cliPort = portIndex !== -1 && cliArgs[portIndex + 1] ? Number(cliArgs[portIndex + 1]) : undefined;
const PORT = Number(process.env.PORT) || cliPort || 3000;

// Prevent server crashes from unhandled asynchronous rejections
process.on('uncaughtException', (err) => {
  console.error('[Server UncaughtException]', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Server UnhandledRejection]', reason);
});

// Setup WebSocket server for Real-time Live API voice conversation
const wss = new WebSocketServer({ server, path: '/ws/live' });

app.use(express.json({ limit: '50mb' }));

// Server-side initialization of Gemini API
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper to sanitize & detect PII
function detectPII(text: string) {
  const warnings: string[] = [];
  if (/\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12})\b/.test(text.replace(/[-\s]/g, ''))) {
    warnings.push('Potential credit card number detected');
  }
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(text)) {
    warnings.push('Potential Social Security Number (SSN) detected');
  }
  if (/(?:AIza[0-9A-Za-z-_]{35}|sk-[a-zA-Z0-9]{32,}|ghp_[a-zA-Z0-9]{36})/.test(text)) {
    warnings.push('Potential API key or secret token detected');
  }
  if (/(?:password|passwd|secret|api_key)\s*[:=]\s*['"][^'"]+['"]/i.test(text)) {
    warnings.push('Potential exposed credentials detected');
  }
  return warnings;
}

// Helper to format friendly error messages
function parseApiError(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';
  const raw = error?.message || String(error);
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error?.message) {
      return parsed.error.message;
    }
  } catch {
    // raw was not json
  }
  return raw;
}

// 1. Chat endpoint (Gemini chatbot with role system instructions, multi-turn history, Search & Maps grounding)
app.post('/api/chat', async (req, res) => {
  try {
    const {
      messages = [],
      mode = 'chat',
      language = 'English',
      gradeLevel = 'High School',
      codeLanguage = 'TypeScript',
      codeAction = 'write',
      studyAction = 'explain',
      useSearchGrounding = false,
      useMapsGrounding = false,
      userLocation = null,
      modelPreference = 'auto',
      attachedFiles = [],
    } = req.body;

    if (!messages.length && !attachedFiles.length) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    // Role-specific System Instructions
    let systemInstruction = `You are "AI Buddy", a friendly, knowledgeable, modern, and reliable AI assistant companion.
Communicate clearly, supportively, and engagingly. Format your responses with clean Markdown (headings, bold text, bullet points, clean tables, and syntax-highlighted code blocks where appropriate).
The user's preferred language is ${language}. Always respond in ${language} unless explicitly requested otherwise.`;

    if (mode === 'code') {
      systemInstruction += `
You are acting in "Code Buddy" mode.
Speciality: Software Engineering & Architecture, Bug Fixing, and Algorithm Optimization.
Current target programming language: ${codeLanguage}.
Current action mode: ${codeAction} (${
        codeAction === 'write'
          ? 'Generate clean, modular, production-ready code with concise explanations and comments'
          : codeAction === 'explain'
          ? 'Break down the code logic, time/space complexity, design patterns, and edge cases clearly'
          : codeAction === 'fix'
          ? 'Identify bugs, syntax issues, runtime pitfalls, provide exact fixes, and show the corrected code'
          : 'Refactor for performance, readability, and modern best practices'
      }).
Always provide well-formatted code blocks with the language identifier (e.g. \`\`\`${codeLanguage.toLowerCase()}).`;
    } else if (mode === 'study') {
      systemInstruction += `
You are acting in "Study Buddy" mode.
Speciality: Interactive education, homework help, conceptual breakdowns, and topic mastery.
Audience grade level: ${gradeLevel}.
Current action mode: ${studyAction} (${
        studyAction === 'homework'
          ? 'Guide the student step-by-step through the problem without just giving the answer directly away; encourage understanding'
          : studyAction === 'explain'
          ? 'Explain complex concepts using intuitive real-world analogies, visual mental models, and step-by-step clarity suited for ' + gradeLevel
          : studyAction === 'quiz'
          ? 'Generate an interactive 3 to 5 question quiz with multiple choices (A, B, C, D) and then provide an answer key with explanations at the end'
          : 'Provide rigorous step-by-step mathematical or conceptual derivations'
      }).
Be encouraging, patient, inspiring, and clear.`;
    } else if (mode === 'search') {
      systemInstruction += `
You are acting in "Search Buddy" mode.
You have real-time Google Web Search grounding enabled via gemini-3.5-flash.
Provide up-to-date, fact-checked, accurate information with fresh real-world citations. Cite your sources and summarize key findings concisely with clear section headers.`;
    } else if (mode === 'maps') {
      systemInstruction += `
You are acting in "Maps Buddy" mode.
You have real-time Google Maps Grounding enabled via gemini-3.5-flash.
Provide accurate geographical details, place recommendations, ratings, opening hours, atmospheres, and addresses.`;
    }

    // Build contents array for Gemini with proper role alternation and normalization
    const normalizedContents: Array<{ role: 'user' | 'model'; parts: any[] }> = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (typeof msg.content === 'string' && msg.content.startsWith('⚠️ Error:')) {
        continue;
      }

      const role: 'user' | 'model' = msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user';
      const parts: any[] = [];

      // If it's the latest user message and has attachments, include them
      if (i === messages.length - 1 && role === 'user' && attachedFiles && attachedFiles.length > 0) {
        for (const file of attachedFiles) {
          if (file.type?.startsWith('image/') && file.base64) {
            const cleanBase64 = file.base64.replace(/^data:image\/[a-z]+;base64,/, '');
            parts.push({
              inlineData: {
                mimeType: file.type,
                data: cleanBase64,
              },
            });
          } else if (file.content) {
            parts.push({
              text: `[Attached File: ${file.name}]\n${file.content}\n[End of File: ${file.name}]`,
            });
          }
        }
      }

      if (msg.content && String(msg.content).trim()) {
        parts.push({ text: String(msg.content).trim() });
      }

      if (parts.length > 0) {
        const last = normalizedContents[normalizedContents.length - 1];
        if (last && last.role === role) {
          last.parts.push(...parts);
        } else {
          normalizedContents.push({ role, parts });
        }
      }
    }

    if (normalizedContents.length === 0) {
      normalizedContents.push({
        role: 'user',
        parts: [{ text: 'Hello AI Buddy!' }],
      });
    } else if (normalizedContents[normalizedContents.length - 1].role !== 'user') {
      normalizedContents.push({
        role: 'user',
        parts: [{ text: 'Please continue.' }],
      });
    }

    const baseConfig: any = {
      systemInstruction,
    };

    // Determine model selection & tools according to specifications:
    // - Complex tasks: gemini-3.1-pro-preview
    // - General tasks & Search/Maps grounding: gemini-3.5-flash
    // - Fast tasks: gemini-3.1-flash-lite
    const isMapsRequested = mode === 'maps' || useMapsGrounding;
    const isSearchRequested = !isMapsRequested && (mode === 'search' || useSearchGrounding);

    let primaryModel = 'gemini-3.5-flash';
    if (isMapsRequested || isSearchRequested) {
      primaryModel = 'gemini-3.5-flash';
    } else if (modelPreference === 'gemini-3.1-pro-preview' || mode === 'code') {
      primaryModel = 'gemini-3.1-pro-preview';
    } else if (modelPreference === 'gemini-3.1-flash-lite') {
      primaryModel = 'gemini-3.1-flash-lite';
    } else if (modelPreference === 'gemini-3.5-flash') {
      primaryModel = 'gemini-3.5-flash';
    }

    let response: any = null;
    let modelUsed = primaryModel;
    let lastError: any = null;

    // 1. Google Maps Grounding
    if (isMapsRequested) {
      try {
        const mapsConfig: any = {
          ...baseConfig,
          tools: [{ googleMaps: {} }],
        };
        if (userLocation?.latitude && userLocation?.longitude) {
          mapsConfig.toolConfig = {
            retrievalConfig: {
              latLng: {
                latitude: Number(userLocation.latitude),
                longitude: Number(userLocation.longitude),
              },
            },
          };
        }
        response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: normalizedContents,
          config: mapsConfig,
        });
        modelUsed = 'gemini-3.5-flash';
      } catch (mapsErr: any) {
        lastError = mapsErr;
        console.warn('Google Maps Grounding error, falling back:', mapsErr?.message || mapsErr);
      }
    }

    // 2. Google Search Grounding
    if (!response && isSearchRequested) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: normalizedContents,
          config: {
            ...baseConfig,
            tools: [{ googleSearch: {} }],
          },
        });
        modelUsed = 'gemini-3.5-flash';
      } catch (searchErr: any) {
        lastError = searchErr;
        console.warn('Google Search Grounding error, falling back:', searchErr?.message || searchErr);
      }
    }

    // 3. Standard / Multi-Model Execution with graceful fallback
    if (!response) {
      const candidateList = Array.from(new Set([primaryModel, 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest']));
      for (const model of candidateList) {
        try {
          response = await ai.models.generateContent({
            model,
            contents: normalizedContents,
            config: baseConfig,
          });
          modelUsed = model;
          break;
        } catch (mErr: any) {
          lastError = mErr;
          console.warn(`Model generation failed with ${model}:`, mErr?.message || mErr);
        }
      }
    }

    if (!response) {
      throw lastError || new Error('All AI models are currently busy. Please try again.');
    }

    const replyText = response.text || '';

    // Extract search and maps grounding metadata if present
    let sources: Array<{ title: string; uri: string }> = [];
    let mapPlaces: Array<{ title: string; uri: string; address?: string; rating?: number; reviewSnippets?: string[] }> = [];
    let searchQueries: string[] = [];

    const candidate = response.candidates?.[0];
    if (candidate?.groundingMetadata) {
      const gMeta = candidate.groundingMetadata as any;
      if (Array.isArray(gMeta.groundingChunks)) {
        for (const chunk of gMeta.groundingChunks) {
          if (chunk.web?.uri) {
            sources.push({
              title: chunk.web.title || chunk.web.uri,
              uri: chunk.web.uri,
            });
          }
          if (chunk.maps?.uri) {
            const reviews = Array.isArray(chunk.maps.placeAnswerSources?.reviewSnippets)
              ? chunk.maps.placeAnswerSources.reviewSnippets.map((r: any) => r.snippet || r.text || String(r))
              : [];
            mapPlaces.push({
              title: chunk.maps.title || 'View Location on Google Maps',
              uri: chunk.maps.uri,
              address: chunk.maps.address || '',
              rating: chunk.maps.rating,
              reviewSnippets: reviews,
            });
          }
        }
      }
      if (Array.isArray(gMeta.webSearchQueries)) {
        searchQueries = gMeta.webSearchQueries;
      }
    }

    const uniqueSources = Array.from(new Map(sources.map((s) => [s.uri, s])).values());
    const uniqueMapPlaces = Array.from(new Map(mapPlaces.map((m) => [m.uri, m])).values());

    return res.json({
      text: replyText,
      sources: uniqueSources,
      mapPlaces: uniqueMapPlaces,
      searchQueries,
      model: modelUsed,
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    const friendlyMsg = parseApiError(error);
    return res.status(500).json({
      error: friendlyMsg,
    });
  }
});

// 2. Audio Transcription endpoint using gemini-3.5-transcribe
app.post('/api/transcribe', async (req, res) => {
  try {
    const { audio, mimeType = 'audio/webm' } = req.body;
    if (!audio) {
      return res.status(400).json({ error: 'Audio data is required for transcription.' });
    }

    const cleanBase64 = audio.replace(/^data:[^;]+;base64,/, '');

    console.log(`[Transcribe] Processing audio with gemini-3.5-transcribe (format: ${mimeType})`);

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          {
            text: 'Transcribe this spoken audio verbatim into accurate, clean text with appropriate punctuation and capitalization. Do not add commentary or introductory filler.',
          },
        ],
      },
    });

    const transcription = response.text?.trim() || '';
    return res.json({ transcription });
  } catch (error: any) {
    console.error('[Transcribe] Error during audio transcription:', error);
    const friendlyMsg = parseApiError(error);
    return res.status(500).json({ error: friendlyMsg });
  }
});

// 3. Text-to-Speech (TTS) endpoint using gemini-3.8-flash-lite-tts
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = 'Puck' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS.' });
    }

    const truncatedText = text.slice(0, 1500);

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [{ text: truncatedText }],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (base64Audio) {
      return res.json({ audio: base64Audio, mimeType: 'audio/pcm;rate=24000' });
    } else {
      return res.json({ audio: null, fallbackToBrowser: true });
    }
  } catch (error: any) {
    console.warn('TTS error (falling back to browser speech):', error?.message);
    return res.json({ audio: null, fallbackToBrowser: true, message: error?.message });
  }
});

// 4. Create & Edit Images endpoint using gemini-3.1-flash-image-preview
app.post('/api/generate-image', async (req, res) => {
  try {
    const {
      prompt,
      sourceImage = null,
      aspectRatio = '1:1',
      style = 'Photorealistic',
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const styledPrompt = sourceImage
      ? `Edit instruction: ${prompt}. Maintain image quality and artistic integrity with high detail.`
      : `${prompt}, ${style} style, high quality, highly detailed visual masterpiece, clean composition`;

    // Attempt generation or editing using gemini-3.1-flash-image-preview
    const imageModels = ['gemini-3.1-flash-image-preview', 'gemini-3.1-flash-image', 'gemini-3.1-flash-lite-image'];

    for (const model of imageModels) {
      try {
        let response: any;
        if (sourceImage) {
          // Edit image mode
          const cleanBase64 = sourceImage.replace(/^data:[^;]+;base64,/, '');
          const matchMime = sourceImage.match(/^data:([^;]+);base64,/);
          const mimeType = matchMime ? matchMime[1] : 'image/png';

          response = await ai.models.generateContent({
            model,
            contents: {
              parts: [
                {
                  inlineData: {
                    data: cleanBase64,
                    mimeType,
                  },
                },
                {
                  text: styledPrompt,
                },
              ],
            },
          });
        } else {
          // Create image mode
          response = await ai.models.generateContent({
            model,
            contents: {
              parts: [{ text: styledPrompt }],
            },
            config: {
              imageConfig: {
                aspectRatio: aspectRatio as any,
              },
            },
          });
        }

        let imageUrl: string | null = null;
        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData?.data) {
              imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
              break;
            }
          }
        }

        if (imageUrl) {
          return res.json({
            imageUrl,
            prompt,
            style,
            aspectRatio,
            isEdited: Boolean(sourceImage),
            source: model,
          });
        }
      } catch (genError: any) {
        console.warn(`Model ${model} image generation/edit error:`, genError?.message || genError);
      }
    }

    // High quality aesthetic fallback image if direct Gemini image model quota is exceeded
    const encodedPrompt = encodeURIComponent(styledPrompt);
    const dimensionsMap: Record<string, { width: number; height: number }> = {
      '1:1': { width: 1024, height: 1024 },
      '16:9': { width: 1280, height: 720 },
      '9:16': { width: 720, height: 1280 },
      '4:3': { width: 1024, height: 768 },
      '3:4': { width: 768, height: 1024 },
    };
    const { width, height } = dimensionsMap[aspectRatio] || { width: 1024, height: 1024 };
    const fallbackUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;

    return res.json({
      imageUrl: fallbackUrl,
      prompt,
      style,
      aspectRatio,
      isEdited: Boolean(sourceImage),
      source: 'pollinations-gen',
    });
  } catch (error: any) {
    console.error('Image generation/editing error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to generate or edit image.' });
  }
});

// 5. Generate Music endpoint using lyria-3-clip-preview (up to 30s) or lyria-3-pro-preview (full track)
app.post('/api/generate-music', async (req, res) => {
  try {
    const {
      prompt,
      modelType = 'clip', // 'clip' (30s) or 'pro' (full track)
      image = null,
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt describing the music style/lyrics is required.' });
    }

    const model = modelType === 'pro' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';
    console.log(`[Lyria Music] Starting generation with ${model}: "${prompt}"`);

    const parts: any[] = [{ text: prompt }];

    if (image && image.data) {
      const cleanImg = image.data.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          data: cleanImg,
          mimeType: image.mimeType || 'image/jpeg',
        },
      });
    }

    let audioBase64 = '';
    let lyrics = '';
    let mimeType = 'audio/wav';

    try {
      const responseStream = await ai.models.generateContentStream({
        model,
        contents: { parts },
      });

      for await (const chunk of responseStream) {
        const chunkParts = chunk.candidates?.[0]?.content?.parts;
        if (!chunkParts) continue;
        for (const part of chunkParts) {
          if (part.inlineData?.data) {
            if (!audioBase64 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioBase64 += part.inlineData.data;
          }
          if (part.text && !lyrics) {
            lyrics = part.text;
          }
        }
      }
    } catch (lyriaErr: any) {
      console.warn('[Lyria Music] Stream failed, checking fallback audio generation:', lyriaErr?.message || lyriaErr);
      throw lyriaErr;
    }

    if (!audioBase64) {
      throw new Error('Music generation completed without audio stream output.');
    }

    return res.json({
      audioBase64,
      mimeType,
      lyrics,
      prompt,
      model,
      modelType,
      duration: modelType === 'clip' ? '30s' : 'Full Track',
    });
  } catch (error: any) {
    console.error('[Lyria Music] Error generating music:', error);
    const friendlyMsg = parseApiError(error);
    return res.status(500).json({ error: friendlyMsg });
  }
});

// 6. Video Generation endpoint (Veo: veo-3.1-fast-generate-preview - supports Text-to-Video and Photo-to-Video)
app.post('/api/generate-video', async (req, res) => {
  try {
    const {
      image = null,
      prompt = 'A smooth cinematic video animation with natural movement',
      aspectRatio = '16:9',
    } = req.body;

    if (!prompt && (!image || !image.imageBytes)) {
      return res.status(400).json({ error: 'A prompt or source photo is required for video generation.' });
    }

    const targetRatio = aspectRatio === '9:16' ? '9:16' : '16:9';
    console.log(`[Veo Video] Initiating ${image ? 'Photo-to-Video' : 'Text-to-Video'} with veo-3.1-fast-generate-preview, ratio: ${targetRatio}`);

    let operation: any;
    if (image && image.imageBytes) {
      const cleanBase64 = image.imageBytes.replace(/^data:[^;]+;base64,/, '');
      const mimeType = image.mimeType || 'image/jpeg';

      operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt || 'A smooth cinematic video animation with natural lighting and motion',
        image: {
          imageBytes: cleanBase64,
          mimeType,
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: targetRatio,
        },
      });
    } else {
      // Text-to-Video generation
      operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt || 'Cinematic drone shot with beautiful volumetric lighting and natural motion',
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: targetRatio,
        },
      });
    }

    console.log(`[Veo Video] Operation initiated:`, operation.name);
    return res.json({
      operationName: operation.name,
      model: 'veo-3.1-fast-generate-preview',
      aspectRatio: targetRatio,
      isTextToVideo: !image,
    });
  } catch (error: any) {
    console.error('[Veo Video] Error generating video:', error);
    const friendlyMsg = parseApiError(error);
    return res.status(500).json({ error: friendlyMsg });
  }
});

// Video status polling endpoint
app.post('/api/video-status', async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required' });
    }

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });

    const isDone = Boolean(updated.done);
    const videoUri = updated.response?.generatedVideos?.[0]?.video?.uri;
    const error = updated.error;

    return res.json({
      done: isDone,
      error: error ? (error.message || String(error)) : null,
      hasVideo: Boolean(videoUri),
    });
  } catch (error: any) {
    console.error('[Veo Video] Status check error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to check video status.' });
  }
});

// Video binary download endpoint
app.post('/api/video-download', async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required' });
    }

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });
    const videoUri = updated.response?.generatedVideos?.[0]?.video?.uri;

    if (!videoUri) {
      return res.status(404).json({ error: 'Video is not ready or URI not found.' });
    }

    const videoRes = await fetch(videoUri, {
      headers: {
        'x-goog-api-key': process.env.GEMINI_API_KEY || '',
      },
    });

    if (!videoRes.ok) {
      return res.status(videoRes.status).json({
        error: `Failed to download video stream from Google Cloud: ${videoRes.statusText}`,
      });
    }

    res.setHeader('Content-Type', 'video/mp4');
    const buffer = await videoRes.arrayBuffer();
    return res.send(Buffer.from(buffer));
  } catch (error: any) {
    console.error('[Veo Video] Video download error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to fetch video.' });
  }
});

// 7. Safety & PII check endpoint
app.post('/api/safety-check', (req, res) => {
  const { text } = req.body;
  if (!text) return res.json({ safe: true, warnings: [] });
  const warnings = detectPII(text);
  return res.json({
    safe: warnings.length === 0,
    warnings,
  });
});

// 8. Telemetry & Error Logging endpoint
const serverErrorBuffer: Array<any> = [];

app.post('/api/telemetry/errors', (req, res) => {
  try {
    const errorData = req.body || {};
    const timestamp = errorData.timestamp || new Date().toISOString();
    const entry = {
      ...errorData,
      serverReceivedAt: timestamp,
    };

    serverErrorBuffer.unshift(entry);
    if (serverErrorBuffer.length > 100) {
      serverErrorBuffer.pop();
    }

    console.error(`[AI-BUDDY-TELEMETRY] Captured Client Error:`, {
      name: errorData.name,
      message: errorData.message,
      url: errorData.url,
      timestamp,
      context: errorData.context,
    });

    return res.status(200).json({ success: true, loggedAt: timestamp });
  } catch (err: any) {
    console.error('[AI-BUDDY-TELEMETRY] Error processing telemetry payload:', err);
    return res.status(500).json({ error: 'Failed to record telemetry' });
  }
});

app.get('/api/telemetry/errors', (_req, res) => {
  res.json({
    count: serverErrorBuffer.length,
    errors: serverErrorBuffer.slice(0, 20),
  });
});

// 9. Real-time Live Voice WebSocket connection via gemini-3.8-live
wss.on('connection', async (clientWs: WebSocket) => {
  console.log('[Live API] Client connected to /ws/live');
  let liveSession: any = null;

  try {
    liveSession = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: 'You are AI Buddy Voice, a helpful, conversational, and friendly real-time assistant. Provide concise, spoken responses with natural inflection.',
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          if (clientWs.readyState !== WebSocket.OPEN) return;

          const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audio) {
            clientWs.send(JSON.stringify({ type: 'audio', audio }));
          }

          if (message.serverContent?.interrupted) {
            clientWs.send(JSON.stringify({ type: 'interrupted' }));
          }

          if (message.serverContent?.turnComplete) {
            clientWs.send(JSON.stringify({ type: 'turnComplete' }));
          }
        },
        onclose: () => {
          console.log('[Live API] Session closed by Gemini');
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'session_closed' }));
          }
        },
      },
    });

    clientWs.send(JSON.stringify({ type: 'ready' }));

    clientWs.on('message', (rawData) => {
      try {
        const payload = JSON.parse(rawData.toString());
        if (!liveSession) return;

        if (payload.type === 'audio' && payload.data) {
          liveSession.sendRealtimeInput({
            audio: {
              data: payload.data,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        } else if (payload.type === 'text' && payload.text) {
          liveSession.sendRealtimeInput({
            text: payload.text,
          });
        }
      } catch (err: any) {
        console.error('[Live API] Error processing client message:', err?.message);
      }
    });

    clientWs.on('close', () => {
      console.log('[Live API] Client disconnected');
      if (liveSession) {
        try {
          liveSession.close();
        } catch {
          // session close catch
        }
      }
    });
  } catch (err: any) {
    console.error('[Live API] Failed to initialize Gemini Live session:', err);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'error', error: parseApiError(err) }));
      clientWs.close();
    }
  }
});

// Mount Vite middleware in dev or static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`AI Buddy server running on http://0.0.0.0:${PORT} with WebSocket on /ws/live`);
});
