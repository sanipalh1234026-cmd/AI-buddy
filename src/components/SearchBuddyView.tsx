import React, { useState } from 'react';
import {
  Search,
  Globe,
  ExternalLink,
  MapPin,
  Compass,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  Link as LinkIcon,
  CheckCircle,
  Mic,
  MicOff,
  Navigation,
  Star,
  Quote,
} from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { sendChatMessage } from '../services/api';
import { GroundingSource, MapPlace } from '../types';
import { useAudioTranscription } from '../utils/useAudioTranscription';

interface SearchBuddyViewProps {
  initialTab?: 'search' | 'maps';
}

export const SearchBuddyView: React.FC<SearchBuddyViewProps> = ({
  initialTab = 'search',
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'maps'>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState('');
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [mapPlaces, setMapPlaces] = useState<MapPlace[]>([]);
  const [queriesUsed, setQueriesUsed] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);

  // Audio transcription using gemini-3.5-transcribe
  const { isRecording, isTranscribing, toggleRecording } = useAudioTranscription((transcribedText) => {
    setSearchQuery((prev) => (prev ? `${prev} ${transcribedText}` : transcribedText));
  });

  const trendingSearchTopics = [
    'Latest discoveries from James Webb Space Telescope',
    'Current breakthroughs in renewable fusion energy',
    'Upcoming Artemis NASA Moon missions roadmap',
    'Global quantum computing milestones',
    'Breakthroughs in artificial intelligence multimodal models',
  ];

  const popularMapsQueries = [
    'Top rated coffee roasters and quiet cafes near me with outdoor seating',
    'Best Italian restaurants and handmade pasta in downtown with good atmosphere',
    'Museums and contemporary art galleries open on weekends',
    'Scenic parks and dog-friendly hiking trails with parking',
    'Top sushi and ramen spots with 4.5+ star reviews',
  ];

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setLocatingUser(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setLocatingUser(false);
      }
    );
  };

  const handleSearch = async (overrideQuery?: string) => {
    const query = overrideQuery || searchQuery;
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMsg('');
    setSearchResult('');
    setSources([]);
    setMapPlaces([]);
    setQueriesUsed([]);

    try {
      if (activeTab === 'maps') {
        const res = await sendChatMessage({
          messages: [{ role: 'user', content: query }],
          mode: 'maps',
          useMapsGrounding: true,
          userLocation,
        });

        setSearchResult(res.text || 'No location details found.');
        setMapPlaces(res.mapPlaces || []);
      } else {
        const res = await sendChatMessage({
          messages: [{ role: 'user', content: query }],
          mode: 'search',
          useSearchGrounding: true,
        });

        setSearchResult(res.text || 'No results found.');
        setSources(res.sources || []);
        setQueriesUsed(res.searchQueries || []);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Grounding request failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
      {/* Banner */}
      <div className={`p-5 rounded-2xl border text-white transition-colors duration-300 ${
        activeTab === 'maps'
          ? 'bg-gradient-to-r from-emerald-950/50 via-teal-900/40 to-slate-900 border-emerald-500/20'
          : 'bg-gradient-to-r from-blue-950/50 via-indigo-900/40 to-slate-900 border-blue-500/20'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
              activeTab === 'maps'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            }`}>
              {activeTab === 'maps' ? <MapPin className="w-6 h-6" /> : <Search className="w-6 h-6" />}
            </div>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <span>{activeTab === 'maps' ? 'Maps & Places Grounding' : 'Search Buddy'}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  activeTab === 'maps'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-blue-500/20 text-blue-300'
                }`}>
                  gemini-3.5-flash
                </span>
              </h1>
              <p className="text-xs text-gray-300 mt-0.5">
                {activeTab === 'maps'
                  ? 'Grounded with real-time Google Maps data: ratings, direct map links, addresses, and customer reviews.'
                  : 'Grounded with live Google Web Search: verified sources, accurate citations, and clickable references.'}
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="inline-flex rounded-xl bg-black/40 p-1 border border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('search');
                setSearchResult('');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'search'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Web Search</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('maps');
                setSearchResult('');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'maps'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Google Maps</span>
            </button>
          </div>
        </div>
      </div>

      {/* Geolocation Notice for Maps */}
      {activeTab === 'maps' && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
            <Navigation className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>
              {userLocation
                ? `Location set (${userLocation.latitude.toFixed(3)}, ${userLocation.longitude.toFixed(3)}) for precise neighborhood grounding`
                : 'Enable current location for accurate "near me" recommendations'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleGetLocation}
            disabled={locatingUser}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition cursor-pointer"
          >
            {locatingUser ? 'Locating...' : userLocation ? 'Update Location' : 'Use My Location'}
          </button>
        </div>
      )}

      {/* Search Input Bar with Audio Transcription Mic */}
      <div className="p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all flex items-center gap-2">
        <div className="pl-2.5 text-gray-400">
          {activeTab === 'maps' ? (
            <MapPin className="w-5 h-5 text-emerald-500" />
          ) : (
            <Search className="w-5 h-5 text-blue-500" />
          )}
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
          placeholder={
            activeTab === 'maps'
              ? 'Ask for restaurants, coffee shops, tourist spots, or addresses nearby...'
              : 'Ask any recent question (e.g. latest tech news, sports scores, space missions)...'
          }
          className="flex-1 bg-transparent text-sm sm:text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-hidden py-1 px-2"
        />

        {/* Microphone button for gemini-3.5-transcribe */}
        <button
          type="button"
          onClick={toggleRecording}
          title={isRecording ? 'Stop recording' : 'Speak query (transcribed by gemini-3.5-transcribe)'}
          className={`p-2 rounded-xl transition cursor-pointer ${
            isRecording
              ? 'bg-rose-500 text-white animate-pulse'
              : isTranscribing
              ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 animate-spin'
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={() => handleSearch()}
          disabled={!searchQuery.trim() || isLoading}
          className={`px-4 sm:px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-white shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            activeTab === 'maps'
              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
              : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
          }`}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">{activeTab === 'maps' ? 'Find Places' : 'Search Web'}</span>
        </button>
      </div>

      {/* Suggested Topics / Queries */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
          <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
          <span>{activeTab === 'maps' ? 'Popular Places & Maps Prompts' : 'Popular Search Topics'}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(activeTab === 'maps' ? popularMapsQueries : trendingSearchTopics).map((topic, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setSearchQuery(topic);
                handleSearch(topic);
              }}
              className="text-xs px-3 py-1.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer text-left"
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-600 dark:text-red-400">
          {errorMsg}
        </div>
      )}

      {/* Google Maps Places Section */}
      {mapPlaces.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <MapPin className="w-4 h-4 text-emerald-500" />
            <span>Grounded Places from Google Maps ({mapPlaces.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mapPlaces.map((place, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs flex flex-col justify-between gap-2.5 hover:border-emerald-400 dark:hover:border-emerald-500 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      {place.title}
                    </h3>
                    <a
                      href={place.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 shrink-0"
                      title="Open in Google Maps"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  {place.address && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{place.address}</span>
                    </p>
                  )}
                  {place.rating && (
                    <div className="flex items-center gap-1 text-xs text-amber-500 font-semibold mt-1">
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                      <span>{place.rating.toFixed(1)} / 5.0</span>
                    </div>
                  )}
                </div>

                {place.reviewSnippets && place.reviewSnippets.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 text-[11px] text-gray-600 dark:text-gray-300 italic flex items-start gap-1.5">
                    <Quote className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                    <span>"{place.reviewSnippets[0]}"</span>
                  </div>
                )}

                <a
                  href={place.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline pt-1"
                >
                  <span>Open on Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sources from Web Search Grounding */}
      {sources.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <Globe className="w-4 h-4 text-blue-500" />
            <span>Verified Sources & Citations ({sources.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {sources.map((s, idx) => (
              <a
                key={idx}
                href={s.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/20 transition group flex flex-col justify-between"
              >
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2">
                  {s.title}
                </p>
                <div className="flex items-center gap-1 text-[11px] text-gray-400 truncate mt-2">
                  <LinkIcon className="w-3 h-3 shrink-0" />
                  <span className="truncate">{s.uri.replace(/^https?:\/\//, '')}</span>
                  <ExternalLink className="w-3 h-3 shrink-0 ml-auto group-hover:text-blue-500" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Search Result Output */}
      {searchResult && (
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-4 h-4" />
              <span>Answer Grounded by {activeTab === 'maps' ? 'Google Maps' : 'Google Search'}</span>
            </div>
            {queriesUsed.length > 0 && (
              <div className="text-[11px] text-gray-400 hidden sm:block">
                Queries: {queriesUsed.slice(0, 2).join(', ')}
              </div>
            )}
          </div>
          <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed text-gray-800 dark:text-gray-200">
            <MarkdownRenderer content={searchResult} />
          </div>
        </div>
      )}
    </div>
  );
};
