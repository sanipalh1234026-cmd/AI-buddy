import { useState, useRef } from 'react';
import { requestTranscribeAudio } from '../services/api';

export function useAudioTranscription(onTranscribed?: (text: string) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    setTranscriptionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/wav';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all audio tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());

        if (audioChunksRef.current.length === 0) {
          setIsTranscribing(false);
          return;
        }

        setIsTranscribing(true);
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          const reader = new FileReader();

          reader.onloadend = async () => {
            const base64Data = (reader.result as string) || '';
            try {
              const text = await requestTranscribeAudio(base64Data, mimeType);
              if (text && onTranscribed) {
                onTranscribed(text);
              }
            } catch (err: any) {
              setTranscriptionError(err?.message || 'Failed to transcribe audio.');
            } finally {
              setIsTranscribing(false);
            }
          };

          reader.readAsDataURL(audioBlob);
        } catch (err: any) {
          setTranscriptionError(err?.message || 'Error processing audio recording.');
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
    } catch (err: any) {
      setTranscriptionError(err?.message || 'Microphone access denied or unavailable.');
      setIsRecording(false);
      setIsTranscribing(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return {
    isRecording,
    isTranscribing,
    transcriptionError,
    startRecording,
    stopRecording,
    toggleRecording,
  };
}
