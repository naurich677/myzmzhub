'use client'

import React, { useState, useRef } from 'react';
import { 
  BarChart3, List as ListIcon, Settings, ScanLine, Mic, Plus, 
  ChevronLeft, ChevronRight, ShoppingBag, Car, Gamepad2, Asterisk, 
  Shirt, X, MoreVertical, Calendar, Wallet, DollarSign, ArrowUp, ArrowDown, 
  Delete, Trash2, Loader2, Receipt, Camera, Image as ImageIcon, Check, RotateCcw, 
  ChevronDown, Box, CheckSquare, Film, Target, Flame, Trophy, Activity, 
  Droplet, Coffee, Moon, Clock, Book, Code, Globe, Music, Ban, Heart, Star,
  Link2, Search, ExternalLink, Eye, Users, MapPin, Clapperboard, Play
} from 'lucide-react';

// --- API КЛЮЧИ ---
const DEEPGRAM_API_KEY = '9f452170be750fc9d27fe0d097e716a35d8bfdb1';
const OPENROUTER_API_KEY = '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';
const TMDB_API_KEY = '15d2ea6d0dc1d476efbca3eba2b9bbfb'; 
const OCR_SPACE_API_KEY = 'helloworld'; 

const CATEGORY_MAP: Record<string, React.ComponentType<{className?: string}>> = {
  'Продукты': ShoppingBag, 'Транспорт': Car, 'Кафе': Box, 'Развлечения': Gamepad2,
  'Одежда': Shirt, 'Разное': Asterisk, 'Зарплата': DollarSign, 'Доход': DollarSign
};

const HABIT_ICONS = [
  { id: 'sport', icon: Activity, label: 'Спорт' }, { id: 'run', icon: Activity, label: 'Бег' },
  { id: 'walk', icon: Activity, label: 'Прогулка' }, { id: 'water', icon: Droplet, label: 'Вода' },
  { id: 'food', icon: Coffee, label: 'Питание' }, { id: 'sleep', icon: Moon, label: 'Сон' },
  { id: 'meditation', icon: Clock, label: 'Медитация' }, { id: 'read', icon: Book, label: 'Чтение' },
  { id: 'code', icon: Code, label: 'Код' }, { id: 'lang', icon: Globe, label: 'Язык' },
  { id: 'music', icon: Music, label: 'Музыка' }, { id: 'ban', icon: Ban, label: 'Отказ' },
  { id: 'health', icon: Heart, label: 'Здоровье' }, { id: 'target', icon: Target, label: 'Цель' },
  { id: 'other', icon: Star, label: 'Другое' }
];

interface Transaction {
  id: number;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  note: string;
}

interface Habit {
  id: number;
  name: string;
  frequency: string;
  iconId: string;
  isCompleted: boolean;
  streak: number;
  total: number;
  days?: number[];
}

interface Movie {
  id: number;
  title: string;
  engTitle: string;
  year: string;
  rating: string;
  genres: string;
  director: string;
  actors: string;
  plot: string;
  poster: string | null;
  isWatched: boolean;
  imdbID: string;
}

export default function App() {
  const [appMode, setAppMode] = useState<'finance' | 'tracker'>('finance'); 
  const [trackerTab, setTrackerTab] = useState<'movies' | 'habits'>('movies'); 
  const [view, setView] = useState<'home' | 'addTransaction' | 'addHabit' | 'scan' | 'movieDetail'>('home'); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showMoviePopup, setShowMoviePopup] = useState(false); 
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: 1, type: 'income', category: 'Зарплата', amount: 1888, date: new Date().toISOString(), note: '' },
    { id: 2, type: 'expense', category: 'Продукты', amount: 1000, date: new Date().toISOString(), note: '' }
  ]);
  
  const [habits, setHabits] = useState<Habit[]>([
    { id: 1, name: 'Пить воду', frequency: 'once', iconId: 'target', isCompleted: false, streak: 0, total: 0 }
  ]);

  const [movies, setMovies] = useState<Movie[]>([
    { id: 1, title: 'Начало', engTitle: 'Inception', year: '2010', rating: '8.8', genres: 'Боевик, Фантастика', director: 'Christopher Nolan', actors: 'Leonardo DiCaprio, Joseph Gordon-Levitt, Elliot Page', plot: 'Вор, крадущий корпоративные секреты с помощью технологии разделения снов, получает обратную задачу — внедрить идею в разум генерального директора...', poster: 'https://image.tmdb.org/t/p/w500/8Z8dptEQ0eex7i9B3p8iZEM0C5a.jpg', isWatched: false, imdbID: 'tt1375666' }
  ]);

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;
  const completedHabitsToday = habits.filter(h => h.isCompleted).length;

  const toggleAppMode = (mode: 'finance' | 'tracker') => { setAppMode(mode); setIsMenuOpen(false); setView('home'); };
  const addTransaction = (tx: Transaction) => { setTransactions(p => [tx, ...p]); };
  const addMovie = (movie: Movie) => { setMovies(p => [movie, ...p]); };
  const deleteMovie = (id: number) => { setMovies(p => p.filter(m => m.id !== id)); };

  const handleVoiceRecord = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
      setIsRecording(false); setIsProcessing(true); setActionFeedback('Обработка...');
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await processVoiceWithDeepgram(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };
        mediaRecorderRef.current.start();
        setIsRecording(true); setActionFeedback('Слушаю...');
      } catch {
        setActionFeedback('Нет доступа к микрофону'); setTimeout(() => setActionFeedback(''), 3000);
      }
    }
  };

  const processVoiceWithDeepgram = async (audioBlob: Blob) => {
    try {
      const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&language=ru&smart_format=true', {
        method: 'POST', headers: { 'Authorization': `Token ${DEEPGRAM_API_KEY}`, 'Content-Type': 'audio/webm' }, body: audioBlob
      });
      const data = await response.json();
      const transcript = data.results?.channels[0]?.alternatives[0]?.transcript || '';
      
      if (!transcript) { setActionFeedback('Не распознано'); return; }

      if (appMode === 'finance') {
        const lowerText = transcript.toLowerCase();
        const numbersMatch = lowerText.match(/\d+(\s\d+)*|\d+/g);
        let amount = numbersMatch ? parseInt(numbersMatch[0].replace(/\s/g, ''), 10) : 0;
        if (lowerText.includes('тысяч')) amount *= 1000;
        if (lowerText.includes('миллион')) amount *= 1000000;

        if (amount > 0) {
          let type: 'income' | 'expense' = 'expense'; let category = 'Продукты'; 
          if (lowerText.includes('доход') || lowerText.includes('зарплат') || lowerText.includes('подработ')) { type = 'income'; category = 'Зарплата'; }
          setTransactions(p => [{ id: Date.now(), type, category, amount, date: new Date().toISOString(), note: 'Голос' }, ...p]);
          setActionFeedback(`${category}: ${type === 'income' ? '+' : '-'}${amount} ₸`);
        } else setActionFeedback('Сумма не найдена');

      } else {
        setActionFeedback('Анализ...');
        const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'z-ai/glm-4.5-air:free',
            messages: [{ role: 'system', content: `Извлеки название привычки и частоту. Верни JSON: {"name": "Читать книгу", "frequency": "daily"}. Возможные частоты: daily, weekly, once.` }, { role: 'user', content: transcript }]
          })
        });
        const aiData = await aiRes.json();
        const match = aiData.choices[0].message.content.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          setHabits(p => [{ id: Date.now(), name: parsed.name || 'Задача', frequency: parsed.frequency || 'once', iconId: 'target', isCompleted: false, streak: 0, total: 0 }, ...p]);
          setActionFeedback(`Добавлено: ${parsed.name}`);
        } else setActionFeedback('Не удалось разобрать');
      }
    } catch { setActionFeedback('Ошибка API'); } 
    finally { setIsProcessing(false); setTimeout(() => setActionFeedback(''), 3000); }
  };

  const handleScanReceipt = async (file: File) => {
    if (!file) return;
    setIsProcessing(true); setActionFeedback('OCR...');
    try {
      const reader = new FileReader(); reader.readAsDataURL(file);
      reader.onload = async () => {
        const formData = new FormData(); formData.append('base64Image', reader.result as string); formData.append('language', 'rus'); formData.append('apikey', OCR_SPACE_API_KEY); formData.append('isOverlayRequired', 'false');
        const ocrRes = await fetch('https://api.ocr.space/parse/image', { method: 'POST', body: formData });
        const ocrData = await ocrRes.json();
        const parsedText = ocrData.ParsedResults?.[0]?.ParsedText || '';
        if (!parsedText) throw new Error('Чек не читаем');

        setActionFeedback('ИИ-анализ...');
        const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST', headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'z-ai/glm-4.5-air:free', messages: [{ role: 'system', content: `Извлеки сумму и категорию (Продукты, Транспорт, Кафе, Развлечения, Одежда, Разное). JSON: {"amount": 1500, "category": "Продукты"}` }, { role: 'user', content: parsedText }] })
        });
        const aiData = await aiRes.json();
        const jsonMatch = aiData.choices[0].message.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          if (result.amount > 0) {
            setTransactions(p => [{ id: Date.now(), type: 'expense', amount: result.amount, category: result.category || 'Разное', date: new Date().toISOString(), note: 'Скан' }, ...p]);
            setActionFeedback(`Чек: -${result.amount} ₸`);
          } else setActionFeedback('Сумма не найдена');
        } else setActionFeedback('Ошибка ИИ');
      };
    } catch { setActionFeedback('Ошибка скана'); } 
    finally { setTimeout(() => { setIsProcessing(false); setActionFeedback(''); }, 3000); }
  };

  const HeaderSwitch = () => (
    <div className="relative z-50">
      <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-1.5 bg-[#0A0A0C] border border-[#1A1A1E] px-1 py-1 pr-2.5 rounded-full active:bg-[#111115] transition-colors shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
        <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center ${appMode === 'finance' ? 'bg-[#142A1E] shadow-[0_0_8px_rgba(74,222,128,0.2)]' : 'bg-[#1A1324] shadow-[0_0_8px_rgba(168,85,247,0.2)]'}`}>
          {appMode === 'finance' ? <Wallet className="w-[11px] h-[11px] text-[#4ADE80]" /> : <Film className="w-[11px] h-[11px] text-[#A855F7]" />}
        </div>
        <div className="flex flex-col justify-center items-start">
          <span className="text-[10px] leading-[10px] font-medium text-white/90 mb-0.5">{appMode === 'finance' ? 'Кошелек' : (trackerTab === 'movies' ? 'Кино' : 'Трекер')}</span>
          <span className="text-[8px] leading-[8px] text-[#8E8E93] font-light">
            {appMode === 'finance' ? `${balance.toLocaleString('ru-RU')} ₸` : (trackerTab === 'movies' ? `${movies.length} к просмотру` : `${completedHabitsToday}/${habits.length} выполнено`)}
          </span>
        </div>
      </button>

      {isMenuOpen && (
        <div className="absolute top-9 left-0 bg-[#0A0A0C] border border-[#1F1F23] rounded-[12px] shadow-[0_8px_30px_rgba(0,0,0,0.8)] p-1 w-[130px] animate-slide-up origin-top-left z-50">
          <button onClick={() => toggleAppMode('finance')} className={`w-full flex items-center gap-2 p-1.5 rounded-[8px] transition-colors ${appMode === 'finance' ? 'bg-[#16161A]' : 'hover:bg-[#16161A]'}`}>
            <Wallet className={`w-[12px] h-[12px] ${appMode === 'finance' ? 'text-[#4ADE80] drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]' : 'text-[#666]'}`} />
            <span className={`text-[11px] ${appMode === 'finance' ? 'text-white font-medium' : 'text-[#8E8E93]'}`}>Кошелек</span>
          </button>
          <button onClick={() => toggleAppMode('tracker')} className={`w-full flex items-center gap-2 p-1.5 rounded-[8px] transition-colors ${appMode === 'tracker' ? 'bg-[#16161A]' : 'hover:bg-[#16161A]'}`}>
            <CheckSquare className={`w-[12px] h-[12px] ${appMode === 'tracker' ? 'text-[#A855F7] drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]' : 'text-[#666]'}`} />
            <span className={`text-[11px] ${appMode === 'tracker' ? 'text-white font-medium' : 'text-[#8E8E93]'}`}>Трекер / Кино</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-black text-white font-sans overflow-hidden flex justify-center selection:bg-[#A855F7]/30 relative">
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes slideUp { from { transform: translateY(15px) scale(0.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        .animate-slide-up { animation: slideUp 0.25s cubic-bezier(0.32, 0.72, 0, 1) forwards; }
        @keyframes slideUpModal { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up-modal { animation: slideUpModal 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.2s ease forwards; }
        .glow-red { background: radial-gradient(circle at right, rgba(153, 27, 27, 0.4) 0%, transparent 70%); }
      `}</style>

      {/* Main Container */}
      <div className="w-full max-w-md bg-[#000000] relative flex flex-col h-[100dvh] overflow-hidden sm:border-x sm:border-[#1A1A1E]" onClick={(e) => {if(!(e.target as HTMLElement).closest('.relative.z-50')) setIsMenuOpen(false);}}>
        
        {/* Header */}
        {view === 'home' && (
          <div className="px-3 pt-10 pb-1.5 flex justify-between items-center z-10">
            <HeaderSwitch />
            <div className="flex gap-1.5">
              <button className="w-7 h-7 rounded-full flex items-center justify-center bg-[#0A0A0C] border border-[#1A1A1E] shadow-sm">
                <BarChart3 className="w-3 h-3 text-[#A0A0A0]" />
              </button>
              <button className="w-7 h-7 rounded-full flex items-center justify-center bg-[#0A0A0C] border border-[#1A1A1E] shadow-sm">
                <Settings className="w-3 h-3 text-[#A0A0A0]" />
              </button>
            </div>
          </div>
        )}

        {/* Content Views */}
        {view === 'home' && appMode === 'finance' && <FinanceHomeView balance={balance} totalIncome={totalIncome} totalExpense={totalExpense} transactions={transactions} onDelete={(id) => setTransactions(p=>p.filter(t=>t.id!==id))} />}
        
        {view === 'home' && appMode === 'tracker' && (
          <TrackerHomeView 
            habits={habits} setHabits={setHabits} 
            movies={movies} setMovies={setMovies} 
            onDeleteMovie={deleteMovie} 
            onSelectMovie={(m) => { setSelectedMovie(m); setView('movieDetail'); }} 
            completedToday={completedHabitsToday} 
            trackerTab={trackerTab} setTrackerTab={setTrackerTab} 
          />
        )}

        {/* Movie Detail / Player View */}
        {view === 'movieDetail' && selectedMovie && (
          <MovieDetailView movie={selectedMovie} onClose={() => setView('home')} />
        )}

        {/* Floating Bottom Nav */}
        {view === 'home' && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-center items-end gap-3 px-3 z-10">
            {appMode === 'finance' ? (
              <button onClick={() => setView('scan')} className="w-[42px] h-[42px] rounded-[14px] flex items-center justify-center bg-[#0F0F12] border border-[#1F1F23] active:bg-[#16161A] shadow-[0_4px_15px_rgba(0,0,0,0.5)]">
                <ScanLine className="w-4 h-4 text-[#A0A0A0]" />
              </button>
            ) : trackerTab === 'movies' ? (
              <button onClick={() => setShowMoviePopup(true)} className="w-[42px] h-[42px] rounded-full flex items-center justify-center bg-[#2D1643] border border-[#4C1D95] shadow-[0_0_15px_rgba(168,85,247,0.3)] active:bg-[#3B1F54] transition-colors">
                <Link2 className="w-4 h-4 text-[#C084FC]" />
              </button>
            ) : (
              <button className="w-[42px] h-[42px] rounded-[14px] flex items-center justify-center bg-transparent border border-transparent pointer-events-none"></button>
            )}

            <button onClick={handleVoiceRecord} className={`w-[52px] h-[52px] rounded-[16px] flex items-center justify-center border transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.6)] ${isRecording ? (appMode === 'finance' ? 'bg-[#112A1A] border-[#4ADE80] shadow-[0_0_20px_rgba(74,222,128,0.4)] animate-pulse' : 'bg-[#1A1324] border-[#A855F7] shadow-[0_0_20px_rgba(168,85,247,0.4)] animate-pulse') : 'bg-[#0F0F12] border-[#1F1F23]'}`}>
              <Mic className={`w-[22px] h-[22px] ${isRecording ? 'text-white' : 'text-[#A0A0A0]'}`} strokeWidth={1.5} />
            </button>

            <button 
              onClick={() => {
                if (appMode === 'finance') setView('addTransaction');
                else if (trackerTab === 'movies') setShowMoviePopup(true);
                else setView('addHabit');
              }} 
              className="w-[42px] h-[42px] rounded-[14px] flex items-center justify-center bg-[#0F0F12] border border-[#1F1F23] active:bg-[#16161A] shadow-[0_4px_15px_rgba(0,0,0,0.5)]"
            >
              <Plus className="w-5 h-5 text-[#A0A0A0]" strokeWidth={1.5} />
            </button>
          </div>
        )}

        {/* Action Views */}
        {view === 'addTransaction' && <AddTransactionView onClose={() => setView('home')} onSave={(tx) => { addTransaction(tx); setView('home'); }} />}
        {view === 'addHabit' && <AddHabitView onClose={() => setView('home')} onSave={(h) => { setHabits(p=>[{id:Date.now(), ...h, isCompleted: false, streak: 0, total: 0}, ...p]); setView('home'); }} />}
        {view === 'scan' && <ScanView onClose={() => setView('home')} onProcess={handleScanReceipt} />}
        
        {/* Modal Popups (Bottom Sheets) */}
        {showMoviePopup && (
          <AddMoviePopup 
            onClose={() => setShowMoviePopup(false)} 
            onSave={(m) => { addMovie(m); setShowMoviePopup(false); }} 
          />
        )}

        {/* Global Feedback */}
        {(isProcessing || actionFeedback) && (
          <div className="absolute bottom-24 left-0 right-0 flex justify-center z-50 animate-slide-up pointer-events-none">
            <div className="bg-[#0A0A0C] border border-[#222] px-3.5 py-1.5 rounded-full text-[11px] font-medium text-white shadow-[0_4px_20px_rgba(0,0,0,0.8)] flex items-center gap-2">
              {isProcessing && <Loader2 className={`w-3 h-3 animate-spin ${appMode === 'finance' ? 'text-[#4ADE80]' : 'text-[#A855F7]'}`} />}
              {actionFeedback}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- VIDEO SEARCH RESULT INTERFACE ---
interface VideoSearchResult {
  id: string;
  title: string;
  duration: number;
  durationText: string;
  thumbnail: string;
  source: 'vk' | 'youtube';
  embedUrl: string;
}

// --- MOVIE DETAIL / MULTI-SERVER PLAYER VIEW ---
function MovieDetailView({ movie, onClose }: { movie: Movie; onClose: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSource, setActiveSource] = useState(0);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [videoSearchResults, setVideoSearchResults] = useState<VideoSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [showVideoSearch, setShowVideoSearch] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoSearchResult | null>(null);

  // Стандартные видеобалансеры
  const SOURCES = [
    { id: 0, name: 'VidFast', getUrl: (id: string) => `https://vidfast.pro/movie/${id}` },
    { id: 1, name: '111Movies', getUrl: (id: string) => `https://111movies.com/movie/${id}` },
    { id: 2, name: 'VidSrc RU', getUrl: (id: string) => `https://vidsrc-embed.ru/embed/movie/${id}` },
    { id: 3, name: 'VidSrc SU', getUrl: (id: string) => `https://vidsrc-embed.su/embed/movie/${id}` },
    { id: 4, name: '2Embed CC', getUrl: (id: string) => `https://www.2embed.cc/embed/${id}` }
  ];

  // Поиск видео в VK и YouTube
  const searchVideos = async () => {
    setIsSearching(true);
    setSearchError('');
    setVideoSearchResults([]);
    setShowVideoSearch(true);

    try {
      const response = await fetch(`/api/video-search?q=${encodeURIComponent(movie.title)}&minDuration=2400`);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        setVideoSearchResults(data.results);
      } else {
        setSearchError('Фильм не найден в VK или YouTube');
      }
    } catch (error) {
      setSearchError('Ошибка поиска видео');
    } finally {
      setIsSearching(false);
    }
  };

  // Если выбрано видео из поиска
  if (isPlaying && selectedVideo) {
    return (
      <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col animate-fade-in w-full max-w-md mx-auto sm:border-x sm:border-[#1A1A1E]">
        <div className="px-3 py-3 flex flex-col gap-2.5 bg-black/95 backdrop-blur-xl border-b border-[#1A1A1E] z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              {selectedVideo.source === 'youtube' ? (
                <div className="w-4 h-4 bg-red-600 rounded-sm flex items-center justify-center shrink-0">
                  <Play className="w-2 h-2 text-white" fill="white" />
                </div>
              ) : (
                <div className="w-4 h-4 bg-blue-500 rounded-sm flex items-center justify-center shrink-0 text-[8px] font-bold text-white">VK</div>
              )}
              <span className="text-white font-bold text-[13px] truncate">{selectedVideo.title}</span>
            </div>
            <button onClick={() => { setIsPlaying(false); setSelectedVideo(null); }} className="w-7 h-7 rounded-full bg-[#1A1A1E] flex items-center justify-center shrink-0 active:bg-[#222] transition-colors">
              <X className="w-4 h-4 text-[#8E8E93]" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#8E8E93]">{selectedVideo.durationText}</span>
            <span className="text-[10px] text-[#A855F7] uppercase font-bold">{selectedVideo.source === 'youtube' ? 'YouTube' : 'VK Video'}</span>
          </div>
        </div>
        
        <div className="flex-1 w-full relative bg-black flex items-center justify-center">
          {!iframeLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-0 gap-3">
               <Loader2 className="w-8 h-8 animate-spin text-[#A855F7]" />
               <span className="text-[#666] text-[11px] font-medium uppercase tracking-widest animate-pulse">Загрузка плеера...</span>
            </div>
          )}
          <iframe
            src={selectedVideo.embedUrl}
            className={`w-full h-full absolute inset-0 z-10 transition-opacity duration-500 ${iframeLoaded ? 'opacity-100' : 'opacity-0'}`}
            allowFullScreen
            allow="autoplay; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            referrerPolicy="no-referrer"
            frameBorder="0"
            title="Video Player"
            onLoad={() => setIframeLoaded(true)}
          />
        </div>
      </div>
    );
  }

  // Стандартный плеер с балансерами
  if (isPlaying) {
    return (
      <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col animate-fade-in w-full max-w-md mx-auto sm:border-x sm:border-[#1A1A1E]">
        <div className="px-3 py-3 flex flex-col gap-2.5 bg-black/95 backdrop-blur-xl border-b border-[#1A1A1E] z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <Film className="w-4 h-4 text-[#A855F7] shrink-0" />
              <span className="text-white font-bold text-[13px] truncate">{movie.title}</span>
            </div>
            <button onClick={() => setIsPlaying(false)} className="w-7 h-7 rounded-full bg-[#1A1A1E] flex items-center justify-center shrink-0 active:bg-[#222] transition-colors">
              <X className="w-4 h-4 text-[#8E8E93]" />
            </button>
          </div>
          
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {SOURCES.map((src) => (
              <button 
                key={src.id}
                onClick={() => { setActiveSource(src.id); setIframeLoaded(false); }}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-colors ${activeSource === src.id ? 'bg-[#2D1643] text-[#C084FC] border border-[#4C1D95] shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'bg-[#121214] text-[#666] border border-[#1A1A1E]'}`}
              >
                {src.name}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1 w-full relative bg-black flex items-center justify-center">
          {!iframeLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-0 gap-3">
               <Loader2 className="w-8 h-8 animate-spin text-[#A855F7]" />
               <span className="text-[#666] text-[11px] font-medium uppercase tracking-widest animate-pulse">Загрузка плеера...</span>
            </div>
          )}
          {movie.imdbID ? (
            <iframe
              src={SOURCES[activeSource].getUrl(movie.imdbID)}
              className={`w-full h-full absolute inset-0 z-10 transition-opacity duration-500 ${iframeLoaded ? 'opacity-100' : 'opacity-0'}`}
              allowFullScreen
              allow="autoplay; fullscreen"
              sandbox="allow-scripts allow-same-origin allow-forms"
              referrerPolicy="no-referrer"
              frameBorder="0"
              title="Movie Player"
              onLoad={() => setIframeLoaded(true)}
            />
          ) : (
            <div className="text-[#888] text-sm z-10">Нет ID для плеера</div>
          )}
        </div>
        <div className="p-2 bg-black text-center text-[#555] text-[9px] uppercase tracking-widest border-t border-[#1A1A1E]">
           Если видео не работает, переключите сервер сверху
        </div>
      </div>
    );
  }

  // Экран поиска видео
  if (showVideoSearch) {
    return (
      <div className="fixed inset-0 z-40 bg-black flex flex-col animate-slide-up w-full max-w-md mx-auto sm:border-x sm:border-[#1A1A1E]">
        <div className="px-3 pt-10 pb-3 flex items-center gap-3 border-b border-[#1A1A1E]">
          <button onClick={() => setShowVideoSearch(false)} className="w-8 h-8 rounded-full flex items-center justify-center bg-[#0A0A0C] border border-[#1A1A1E]">
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <div>
            <h2 className="text-white font-bold text-[14px]">Поиск: {movie.title}</h2>
            <p className="text-[#666] text-[10px]">VK Video и YouTube (от 40 мин)</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-[#A855F7]" />
              <span className="text-[#666] text-[12px] mt-3">Поиск видео...</span>
            </div>
          ) : searchError ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Film className="w-12 h-12 text-[#333] mb-3" />
              <p className="text-[#888] text-[12px]">{searchError}</p>
              <button onClick={searchVideos} className="mt-4 px-4 py-2 bg-[#A855F7] rounded-full text-white text-[11px] font-bold">
                Повторить поиск
              </button>
            </div>
          ) : videoSearchResults.length > 0 ? (
            <div className="space-y-2">
              {videoSearchResults.map((video, index) => (
                <button
                  key={video.id}
                  onClick={() => { setSelectedVideo(video); setIsPlaying(true); }}
                  className="w-full flex gap-3 p-2 bg-[#0A0A0C] border border-[#1A1A1E] rounded-[12px] active:bg-[#111] transition-colors text-left"
                >
                  <div className="w-[100px] h-[56px] bg-[#16161A] rounded-[8px] overflow-hidden shrink-0 relative">
                    {video.thumbnail && (
                      <img src={video.thumbnail} className="w-full h-full object-cover" alt="" />
                    )}
                    <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[8px] text-white font-medium">
                      {video.durationText}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-white text-[12px] font-medium line-clamp-2 mb-1">{video.title}</p>
                    <div className="flex items-center gap-2">
                      {video.source === 'youtube' ? (
                        <span className="flex items-center gap-1 text-[10px] text-red-500 font-bold">
                          <div className="w-3 h-3 bg-red-600 rounded-sm flex items-center justify-center">
                            <Play className="w-1.5 h-1.5 text-white" fill="white" />
                          </div>
                          YouTube
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-blue-400 font-bold">
                          <div className="w-3 h-3 bg-blue-500 rounded-sm text-[6px] flex items-center justify-center text-white font-bold">VK</div>
                          VK Video
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-black flex flex-col animate-slide-up w-full max-w-md mx-auto sm:border-x sm:border-[#1A1A1E]">
      <button onClick={onClose} className="absolute top-12 left-4 w-9 h-9 rounded-full flex items-center justify-center bg-black/50 backdrop-blur-lg border border-white/10 z-50 shadow-[0_4px_15px_rgba(0,0,0,0.5)]">
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>

      <div className="relative w-full h-[45%] shrink-0 overflow-hidden">
        {movie.poster && movie.poster !== 'N/A' ? (
          <img src={movie.poster} className="w-full h-full object-cover opacity-80" alt={movie.title} />
        ) : (
          <div className="w-full h-full bg-[#16161A] flex items-center justify-center"><Film className="w-16 h-16 text-[#333]" /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-32 -mt-8 relative z-10 hide-scrollbar">
        <h1 className="text-[32px] font-bold text-white leading-tight mb-0.5 tracking-tight drop-shadow-md">{movie.title}</h1>
        <p className="text-[12px] text-[#8E8E93] font-medium mb-4">{movie.engTitle}</p>

        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <span className="flex items-center gap-1.5 bg-[#16161A] px-2.5 py-1 rounded-[8px] text-[11px] font-medium text-[#8E8E93] shadow-sm">
            <Calendar className="w-3.5 h-3.5" /> {movie.year}
          </span>
          <span className="flex items-center gap-1.5 bg-[#2A200A] px-2.5 py-1 rounded-[8px] text-[11px] font-bold text-[#F5C347] shadow-[0_2px_8px_rgba(245,195,71,0.1)] border border-[#4A3A1A]">
            <Star className="w-3.5 h-3.5" fill="currentColor" /> {movie.rating}
          </span>
          <span className="flex items-center gap-1.5 bg-[#1A1324] px-2.5 py-1 rounded-[8px] text-[11px] font-medium text-[#A855F7] shadow-sm border border-[#2D1643]">
            <Clapperboard className="w-3.5 h-3.5" /> {movie.genres}
          </span>
        </div>

        <div className="space-y-3 border-t border-[#1A1A1E] pt-5">
          <div className="flex gap-2">
            <span className="text-[11px] font-medium text-[#555] w-20 shrink-0 uppercase tracking-wide">Режиссёр</span>
            <span className="text-[12px] font-medium text-white">{movie.director}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[11px] font-medium text-[#555] w-20 shrink-0 uppercase tracking-wide">В ролях</span>
            <span className="text-[12px] font-medium text-[#A0A0A0] leading-relaxed">{movie.actors}</span>
          </div>
        </div>

        <div className="mt-6">
          <span className="text-[11px] font-medium text-[#555] uppercase tracking-wide mb-2 block">Описание</span>
          <p className="text-[13px] text-[#888] leading-relaxed">
            {movie.plot}
          </p>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent pb-8 z-20">
        <button onClick={() => setIsPlaying(true)} className="w-full h-[56px] bg-[#5B21B6] rounded-[16px] flex items-center justify-center gap-2 font-bold text-[16px] text-white shadow-[0_4px_25px_rgba(91,33,182,0.6)] active:bg-[#4C1D95] transition-colors mb-3">
          <Play className="w-5 h-5" fill="currentColor" />
          Смотреть фильм
        </button>
        <button onClick={searchVideos} className="w-full h-[44px] bg-[#1A1A1E] border border-[#2A2A2E] rounded-[12px] flex items-center justify-center gap-2 font-medium text-[13px] text-[#A0A0A0] active:bg-[#222] transition-colors">
          <Search className="w-4 h-4" />
          Найти в VK / YouTube
        </button>
      </div>
    </div>
  );
}

// --- FINANCE HOME VIEW ---
function FinanceHomeView({ balance, totalIncome, totalExpense, transactions, onDelete }: { balance: number; totalIncome: number; totalExpense: number; transactions: Transaction[]; onDelete: (id: number) => void }) {
  const formatMoney = (val: number) => (val || 0).toLocaleString('ru-RU');
  return (
    <div className="flex-1 overflow-y-auto pb-24 hide-scrollbar">
      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[60vh] px-8 text-center text-[#8E8E93]">
          <h2 className="text-[14px] font-medium text-white mb-1.5">Пусто</h2>
          <p className="text-[11px] leading-relaxed mb-6">Используйте голос или сканер</p>
          <ChevronDown className="w-4 h-4 animate-bounce text-[#444]" />
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center mt-2 mb-4">
            <div className="flex items-center gap-1.5 text-[10px] text-[#8E8E93] mb-1.5">
              <span className="font-light tracking-wide">ЗА МЕСЯЦ</span>
              <div className="flex items-center gap-1 text-white bg-[#0A0A0C] border border-[#1A1A1E] px-1.5 py-0.5 rounded-md shadow-sm">
                <span className="text-[10px] font-medium">Март</span><ChevronRight className="w-2.5 h-2.5 text-[#555]" />
              </div>
            </div>
            <h1 className="text-[38px] font-semibold tracking-tight mb-2 text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)]">
              {formatMoney(balance)} <span className="font-medium text-[24px] text-[#8E8E93]">₸</span>
            </h1>
            <div className="flex gap-4 text-[12px] font-semibold">
              <div className="flex items-center gap-1 bg-[#0A0A0C] border border-[#1A1A1E] px-2 py-1 rounded-md shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                <ArrowUp className="w-3 h-3 text-[#4ADE80] drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]" strokeWidth={3} />
                <span className="text-[#4ADE80] drop-shadow-[0_0_8px_rgba(74,222,128,0.3)]">{formatMoney(totalIncome)} ₸</span>
              </div>
              <div className="flex items-center gap-1 bg-[#0A0A0C] border border-[#1A1A1E] px-2 py-1 rounded-md shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                <ArrowDown className="w-3 h-3 text-[#FF453A] drop-shadow-[0_0_5px_rgba(255,69,58,0.5)]" strokeWidth={3} />
                <span className="text-[#FF453A] drop-shadow-[0_0_8px_rgba(255,69,58,0.3)]">{formatMoney(totalExpense)} ₸</span>
              </div>
            </div>
          </div>
          <div className="px-3">
            <div className="flex justify-between items-end mb-1.5 px-1">
              <span className="text-[10px] text-[#666] font-medium tracking-wide uppercase">Сегодня</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {transactions.map(tx => <FinanceItem key={tx.id} tx={tx} formatMoney={formatMoney} onDelete={onDelete} />)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FinanceItem({ tx, formatMoney, onDelete }: { tx: Transaction; formatMoney: (val: number) => string; onDelete: (id: number) => void }) {
  const [offset, setOffset] = useState(0); const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0), startOffset = useRef(0), isSwiping = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => { 
    startX.current = e.clientX; startOffset.current = offset; 
    setIsDragging(true); isSwiping.current = false; (e.target as HTMLElement).setPointerCapture(e.pointerId); 
  };
  const onPointerMove = (e: React.PointerEvent) => { 
    if (!isDragging) return; const diff = e.clientX - startX.current; 
    if (Math.abs(diff) > 5) isSwiping.current = true; 
    if (isSwiping.current) setOffset(Math.max(-70, Math.min(0, startOffset.current + diff))); 
  };
  const onPointerUp = (e: React.PointerEvent) => { 
    if(!isDragging) return; setIsDragging(false); (e.target as HTMLElement).releasePointerCapture(e.pointerId); 
    setOffset(offset < -35 ? -60 : 0); 
  };

  const isIncome = tx.type === 'income';
  const iconBg = isIncome ? 'bg-gradient-to-b from-[#142A1E] to-[#0A160F] border-[#1D402B]' : 'bg-gradient-to-b from-[#1E2024] to-[#0D0E10] border-[#2A2D33]';
  const CatIcon = CATEGORY_MAP[tx.category] || (isIncome ? DollarSign : ShoppingBag);

  return (
    <div className="relative w-full rounded-[14px] overflow-hidden bg-black" style={{ touchAction: 'pan-y' }}>
      <div className="absolute inset-0 bg-gradient-to-l from-[#DC3E3E] to-[#991B1B] flex justify-end items-center pr-4 rounded-[14px] shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
        <button onClick={() => onDelete(tx.id)} className="flex flex-col items-center justify-center gap-0.5"><Trash2 className="w-[14px] h-[14px] text-white" /><span className="text-[8px] font-medium text-white">Удал.</span></button>
      </div>
      <div onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} className="relative w-full flex items-center justify-between p-2.5 bg-[#080808] border border-[#16161A] rounded-[14px] select-none shadow-[0_2px_8px_rgba(0,0,0,0.6)]" style={{ transform: `translateX(${offset}px)`, transition: isDragging ? 'none' : 'transform 0.2s ease' }}>
        <div className="flex items-center gap-2.5 pointer-events-none">
          <div className={`w-[32px] h-[32px] rounded-[10px] flex items-center justify-center border shadow-inner ${iconBg}`}>
            <CatIcon className={`w-[15px] h-[15px] ${isIncome ? 'text-[#4ADE80]' : 'text-[#D0D0D0]'}`} strokeWidth={1.5} />
          </div>
          <span className="text-[13px] font-medium text-white/90">{tx.category}</span>
        </div>
        <span className={`text-[14px] font-bold pointer-events-none ${isIncome ? 'text-[#4ADE80] drop-shadow-[0_0_6px_rgba(74,222,128,0.3)]' : 'text-white/90 drop-shadow-[0_0_4px_rgba(255,255,255,0.1)]'}`}>
          {isIncome ? '+' : '-'}{formatMoney(tx.amount)}
        </span>
      </div>
    </div>
  );
}

// --- TRACKER HOME VIEW ---
function TrackerHomeView({ habits, setHabits, movies, setMovies, onDeleteMovie, onSelectMovie, completedToday, trackerTab, setTrackerTab }: { habits: Habit[]; setHabits: React.Dispatch<React.SetStateAction<Habit[]>>; movies: Movie[]; setMovies: React.Dispatch<React.SetStateAction<Movie[]>>; onDeleteMovie: (id: number) => void; onSelectMovie: (m: Movie) => void; completedToday: number; trackerTab: string; setTrackerTab: (tab: 'movies' | 'habits') => void }) {
  const toggleHabit = (id: number) => {
    setHabits(p => p.map(h => {
      if(h.id === id) { const isComp = !h.isCompleted; return { ...h, isCompleted: isComp, streak: isComp ? h.streak+1 : Math.max(0, h.streak-1), total: isComp ? h.total+1 : Math.max(0, h.total-1) }; }
      return h;
    }));
  };
  const toggleMovie = (id: number) => { setMovies(p => p.map(m => m.id === id ? { ...m, isWatched: !m.isWatched } : m)); };
  const totalStreak = habits.reduce((a, c) => a + c.streak, 0); const totalCompleted = habits.reduce((a, c) => a + c.total, 0);

  return (
    <div className="flex-1 overflow-y-auto pb-24 hide-scrollbar">
      <div className="px-3 mt-1 mb-3 flex gap-1.5">
        <button onClick={() => setTrackerTab('habits')} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.5)] transition-colors ${trackerTab === 'habits' ? 'bg-[#0D1C14] border border-[#1A3A25]' : 'bg-[#0A0A0C] border border-[#16161A]'}`}>
          <Target className={`w-3 h-3 ${trackerTab === 'habits' ? 'text-[#4ADE80] drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]' : 'text-[#555]'}`} />
          <span className={`text-[11px] font-semibold tracking-wide ${trackerTab === 'habits' ? 'text-[#4ADE80]' : 'text-[#666]'}`}>ПРИВЫЧКИ</span>
        </button>
        <button onClick={() => setTrackerTab('movies')} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.5)] transition-colors ${trackerTab === 'movies' ? 'bg-[#1A1324] border border-[#2D1643]' : 'bg-[#0A0A0C] border border-[#16161A]'}`}>
          <Film className={`w-3 h-3 ${trackerTab === 'movies' ? 'text-[#A855F7] drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]' : 'text-[#555]'}`} />
          <span className={`text-[11px] font-semibold tracking-wide ${trackerTab === 'movies' ? 'text-[#A855F7]' : 'text-[#666]'}`}>КИНО</span>
          <div className="w-3.5 h-3.5 rounded-full bg-[#2D1643] text-[#D8B4FE] flex items-center justify-center text-[8px] font-bold">{movies.length}</div>
        </button>
      </div>

      {trackerTab === 'habits' ? (
        <>
          <div className="px-3 grid grid-cols-3 gap-1.5 mb-4">
            <div className="bg-[#0A0A0C] border border-[#16161A] rounded-[14px] p-2.5 flex flex-col items-center justify-center gap-1 shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
              <div className="w-5 h-5 rounded-full bg-[#0D1C14] flex items-center justify-center"><Check className="w-2.5 h-2.5 text-[#4ADE80]" strokeWidth={3} /></div>
              <span className="text-[16px] font-bold text-white leading-none drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]">{completedToday}/{habits.length}</span>
              <span className="text-[9px] text-[#666] font-medium uppercase tracking-wide">Сегодня</span>
            </div>
            <div className="bg-[#0A0A0C] border border-[#16161A] rounded-[14px] p-2.5 flex flex-col items-center justify-center gap-1 shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
              <div className="w-5 h-5 rounded-full bg-[#24130A] flex items-center justify-center"><Flame className="w-2.5 h-2.5 text-[#F58B47]" /></div>
              <span className="text-[16px] font-bold text-white leading-none drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]">{totalStreak}</span>
              <span className="text-[9px] text-[#666] font-medium uppercase tracking-wide">Серия</span>
            </div>
            <div className="bg-[#0A0A0C] border border-[#16161A] rounded-[14px] p-2.5 flex flex-col items-center justify-center gap-1 shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
              <div className="w-5 h-5 rounded-full bg-[#241E0A] flex items-center justify-center"><Trophy className="w-2.5 h-2.5 text-[#F5C347]" /></div>
              <span className="text-[16px] font-bold text-white leading-none drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]">{totalCompleted}</span>
              <span className="text-[9px] text-[#666] font-medium uppercase tracking-wide">Всего</span>
            </div>
          </div>

          <div className="px-3">
            <div className="flex flex-col gap-1.5">
              {habits.length === 0 ? (
                 <div className="text-center text-[#444] py-8 text-[11px] uppercase tracking-wide font-medium">Добавьте цель</div>
              ) : habits.map(h => {
                const HIcon = HABIT_ICONS.find(i => i.id === h.iconId)?.icon || Target;
                const bgClass = h.isCompleted ? 'bg-gradient-to-r from-[#0D1C14] to-[#08120D] border border-[#1A3A25]' : 'bg-gradient-to-r from-[#240D0D] to-[#120808] border border-[#3A1A1A]';
                return (
                  <div key={h.id} onClick={() => toggleHabit(h.id)} className={`w-full rounded-[16px] p-2.5 flex items-center gap-2.5 cursor-pointer transition-all shadow-[0_2px_8px_rgba(0,0,0,0.6)] ${bgClass}`}>
                    <div className={`w-5 h-5 shrink-0 rounded-[6px] flex items-center justify-center transition-colors ${h.isCompleted ? 'bg-[#4ADE80] shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'border border-[#552222] bg-[#1A0A0A]'}`}>
                      {h.isCompleted && <Check className="w-3 h-3 text-[#0A1A0F]" strokeWidth={3} />}
                    </div>
                    <div className={`w-8 h-8 shrink-0 rounded-[10px] flex items-center justify-center shadow-inner ${h.isCompleted ? 'bg-[#1A3A25]' : 'bg-[#3A2A12] border border-[#5A401A]'}`}>
                       <HIcon className={`w-4 h-4 ${h.isCompleted ? 'text-[#4ADE80]' : 'text-[#F5C347] drop-shadow-[0_0_4px_rgba(245,195,71,0.4)]'}`} strokeWidth={1.5} />
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-[13px] font-medium tracking-wide ${h.isCompleted ? 'text-white/40 line-through' : 'text-white/90 drop-shadow-[0_0_2px_rgba(255,255,255,0.2)]'}`}>{h.name}</span>
                      <span className="text-[9px] font-medium text-[#666] mt-0.5 uppercase tracking-wider">{h.frequency === 'once' ? 'Разовая' : (h.frequency === 'daily' ? 'Ежедневно' : 'Еженедельно')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="px-3">
          <span className="text-[10px] text-[#666] font-bold tracking-widest uppercase mb-2 block ml-1">СМОТРЕТЬ ВЕЧЕРОМ</span>
          <div className="flex flex-col gap-2">
            {movies.length === 0 ? (
               <div className="text-center text-[#444] py-8 text-[11px] uppercase tracking-wide font-medium">Список пуст</div>
            ) : movies.map(m => (
               <SwipeableMovieItem key={m.id} movie={m} onToggle={toggleMovie} onDelete={onDeleteMovie} onSelect={onSelectMovie} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- SWIPEABLE MOVIE ITEM ---
function SwipeableMovieItem({ movie, onToggle, onDelete, onSelect }: { movie: Movie; onToggle: (id: number) => void; onDelete: (id: number) => void; onSelect: (m: Movie) => void }) {
  const [offset, setOffset] = useState(0); 
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0), startY = useRef(0), startOffset = useRef(0), isSwiping = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => { 
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;
    startX.current = e.clientX; startY.current = e.clientY; startOffset.current = offset; 
    setIsDragging(true); isSwiping.current = false; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); 
  };
  const onPointerMove = (e: React.PointerEvent) => { 
    if (!isDragging) return; 
    const diffX = e.clientX - startX.current; const diffY = e.clientY - startY.current;
    if (!isSwiping.current) {
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 5) isSwiping.current = true;
      else if (Math.abs(diffY) > 5) { setIsDragging(false); return; }
    }
    if (isSwiping.current) {
      let newOffset = startOffset.current + diffX;
      if (newOffset > 0) newOffset = 0; if (newOffset < -80) newOffset = -80;
      setOffset(newOffset);
    }
  };
  const onPointerUp = (e: React.PointerEvent) => { 
    if(!isDragging) return; 
    setIsDragging(false); 
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); 
    
    if (!isSwiping.current && offset === 0) {
      onSelect(movie); 
    } else {
      setOffset(offset < -40 ? -75 : 0); 
    }
  };

  return (
    <div className="relative w-full rounded-[16px] overflow-hidden bg-black" style={{ touchAction: 'pan-y' }}>
      <div className="absolute inset-0 bg-gradient-to-l from-[#DC3E3E] to-[#991B1B] flex justify-end items-center pr-5 rounded-[16px] shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
        <button onClick={() => onDelete(movie.id)} className="flex flex-col items-center justify-center gap-0.5 active:opacity-60">
          <Trash2 className="w-[16px] h-[16px] text-white" />
          <span className="text-[9px] font-medium text-white">Удалить</span>
        </button>
      </div>

      <div onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} className="relative w-full bg-[#0D0D0F] border border-[#1A1A1E] rounded-[16px] flex overflow-hidden shadow-[0_4px_15px_rgba(0,0,0,0.6)] cursor-pointer" style={{ transform: `translateX(${offset}px)`, transition: isDragging ? 'none' : 'transform 0.2s ease' }}>
        <div className="absolute right-0 top-0 bottom-0 w-24 glow-red pointer-events-none z-0" />
        <div className="flex w-full p-2.5 relative z-10 items-center">
          <div className="w-[50px] h-[72px] shrink-0 rounded-[8px] bg-[#16161A] overflow-hidden mr-3 shadow-inner pointer-events-none">
            {movie.poster && movie.poster !== 'N/A' ? <img src={movie.poster} className={`w-full h-full object-cover transition-opacity ${movie.isWatched ? 'opacity-40 grayscale' : 'opacity-90'}`} alt="poster" /> : <Film className="w-6 h-6 text-[#333] m-auto mt-6" />}
          </div>
          <div className="flex flex-col flex-1 min-w-0 pr-2 pointer-events-none">
            <span className={`text-[14px] font-bold truncate tracking-wide ${movie.isWatched ? 'text-[#888] line-through' : 'text-white drop-shadow-sm'}`}>{movie.title}</span>
            <span className="text-[10px] text-[#666] font-medium truncate mb-1">{movie.engTitle || 'Movie'}</span>
            <div className="flex items-center gap-1.5 mb-1 text-[9px] font-medium">
              <span className="bg-[#16161A] px-1.5 py-0.5 rounded text-[#8E8E93]">{movie.year}</span>
              <span className="bg-[#1A130A] px-1.5 py-0.5 rounded text-[#F5C347] flex items-center gap-0.5"><Star className="w-2.5 h-2.5" fill="currentColor" /> {movie.rating}</span>
              <span className="bg-[#161324] px-1.5 py-0.5 rounded text-[#A855F7] truncate max-w-[80px]">{movie.genres}</span>
            </div>
            <span className="text-[9px] text-[#555] font-medium truncate">{movie.director}</span>
          </div>
          <div className="flex flex-col gap-2 shrink-0 z-20">
            <button onClick={() => onToggle(movie.id)} className={`w-[30px] h-[30px] rounded-full border flex items-center justify-center transition-colors cursor-pointer ${movie.isWatched ? 'border-[#2D1643] bg-[#2D1643] text-[#A855F7]' : 'border-[#2D1643] text-[#A855F7] hover:bg-[#1A1324]'}`}>
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- ADD MOVIE BOTTOM POPUP (TMDB API) ---
function AddMoviePopup({ onClose, onSave }: { onClose: () => void; onSave: (m: Movie) => void }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    Title: string; engTitle: string; Year: string; imdbRating: string; Country: string;
    Genre: string; Director: string; Actors: string; Plot: string; Poster: string | null; imdbID: string;
  } | null>(null);
  const [error, setError] = useState('');

  const searchMovie = async () => {
    if(!query.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&language=ru-RU&query=${encodeURIComponent(query)}`);
      const data = await res.json();
      
      if (data.results && data.results.length > 0) {
        const movie = data.results[0];
        const detailRes = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_API_KEY}&language=ru-RU&append_to_response=credits`);
        const detailData = await detailRes.json();

        const director = detailData.credits?.crew?.find((c: { job: string }) => c.job === 'Director')?.name || 'Неизвестно';
        const actors = detailData.credits?.cast?.slice(0, 3).map((a: { name: string }) => a.name).join(', ') || 'Неизвестно';
        const genres = detailData.genres?.map((g: { name: string }) => g.name).join(', ') || 'Кино';
        const country = detailData.production_countries?.[0]?.iso_3166_1 || 'США';
        const posterUrl = detailData.poster_path ? `https://image.tmdb.org/t/p/w500${detailData.poster_path}` : null;

        setResult({
          Title: detailData.title, engTitle: detailData.original_title, Year: detailData.release_date?.split('-')[0] || '',
          imdbRating: detailData.vote_average?.toFixed(1) || '0.0', Country: country, Genre: genres, Director: director,
          Actors: actors, Plot: detailData.overview || 'Описание отсутствует', Poster: posterUrl, imdbID: detailData.imdb_id
        });
      } else setError('Фильм не найден. Проверьте название.');
    } catch { setError('Ошибка сети. Проверьте интернет.'); }
    setLoading(false);
  };

  const handleSave = () => {
    if(!result) return;
    onSave({
      id: Date.now(), title: result.Title, engTitle: result.engTitle, year: result.Year, 
      rating: result.imdbRating, genres: result.Genre, director: result.Director, actors: result.Actors, plot: result.Plot,
      poster: result.Poster, isWatched: false, imdbID: result.imdbID
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm animate-fade-in sm:items-end">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="w-full max-w-md bg-[#0A0A0C] border-t border-[#1A1A1E] rounded-t-[32px] flex flex-col max-h-[85vh] animate-slide-up-modal relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
        <div className="w-full flex justify-center pt-3 pb-1">
          <div className="w-10 h-1.5 bg-[#222] rounded-full" />
        </div>

        <div className="px-5 pt-3 pb-4 flex items-center justify-between border-b border-[#16161A]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[10px] bg-[#1A1324] border border-[#2D1643] flex items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.2)]">
              <Film className="w-4 h-4 text-[#A855F7]" />
            </div>
            <span className="text-[16px] font-bold text-white tracking-wide drop-shadow-sm">Добавить фильм</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-[#121214] border border-[#1E1E22] active:bg-[#1A1A1E]">
            <X className="w-4 h-4 text-[#8E8E93]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-8 hide-scrollbar">
          {!result ? (
            <>
              <div className="relative mb-5 group">
                <div className="absolute inset-0 bg-[#A855F7]/10 blur-[20px] rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                <input 
                  value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e => e.key==='Enter' && searchMovie()}
                  placeholder="Inception, Интерстеллар..." 
                  className="w-full relative bg-[#121214] border border-[#1E1E22] focus:border-[#4C1D95] rounded-[16px] p-4 pr-14 text-white text-[15px] font-medium outline-none placeholder-[#444] shadow-inner transition-colors" 
                />
                <button onClick={searchMovie} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A855F7] p-2.5 bg-[#1A1324] rounded-[12px] active:bg-[#2D1643] transition-colors shadow-[0_2px_8px_rgba(168,85,247,0.2)]">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" strokeWidth={2.5} />}
                </button>
              </div>
              <p className="text-[11px] text-[#555] font-medium px-1 leading-relaxed">Введите название — постер, рейтинг и данные подтянутся автоматически</p>
              {error && <p className="text-red-500 text-[12px] mt-4 font-medium text-center bg-red-500/10 py-2.5 rounded-[12px] border border-red-500/20">{error}</p>}
            </>
          ) : (
            <div className="animate-fade-in">
              <div className="bg-[#121214] border border-[#1A1A1E] rounded-[24px] p-4 mb-4 shadow-[0_8px_30px_rgba(0,0,0,0.8)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#4C1D95]/20 blur-[60px] pointer-events-none rounded-full" />
                
                <div className="flex gap-4 relative z-10">
                  <div className="w-[100px] h-[140px] shrink-0 rounded-[12px] overflow-hidden bg-[#1A1A1E] shadow-lg border border-[#222]">
                     {result.Poster ? <img src={result.Poster} className="w-full h-full object-cover" alt="poster" /> : <Film className="w-8 h-8 text-[#444] m-auto mt-12" />}
                  </div>
                  <div className="flex flex-col pt-1 justify-center">
                    <h2 className="text-[18px] font-bold text-white leading-tight mb-1">{result.Title}</h2>
                    <div className="flex items-center gap-1.5 mb-3 text-[11px] font-medium flex-wrap">
                      <span className="flex items-center gap-1 bg-[#1A1A1E] px-2 py-0.5 rounded-md text-[#8E8E93]"><Calendar className="w-3 h-3"/> {result.Year}</span>
                      <span className="flex items-center gap-1 bg-[#2A200A] px-2 py-0.5 rounded-md text-[#F5C347]"><Star className="w-3 h-3" fill="currentColor" /> {result.imdbRating}</span>
                      <span className="flex items-center gap-1 bg-[#1A1A1E] px-2 py-0.5 rounded-md text-[#8E8E93]"><MapPin className="w-3 h-3"/> {result.Country}</span>
                    </div>
                    <span className="flex items-center gap-1.5 text-[11px] text-[#A855F7] mb-2 font-medium bg-[#1A1324] self-start px-2 py-1 rounded-[8px] line-clamp-1"><Clapperboard className="w-3 h-3 shrink-0" /> {result.Genre}</span>
                    <span className="text-[11px] text-[#8E8E93] mb-1">Режиссёр: <span className="text-white">{result.Director}</span></span>
                    <span className="text-[11px] text-[#8E8E93] flex items-start gap-1"><Users className="w-3 h-3 shrink-0 mt-0.5" /> <span className="text-white/80 line-clamp-2">{result.Actors}</span></span>
                  </div>
                </div>

                <div className="mt-5 text-[12px] text-[#888] leading-relaxed relative z-10 border-t border-[#1A1A1E] pt-4">
                  {result.Plot}
                </div>
              </div>

              <button onClick={handleSave} className="w-full h-[56px] rounded-[16px] bg-[#5B21B6] text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(91,33,182,0.5)] active:bg-[#4C1D95] transition-colors mb-3">
                <Check className="w-5 h-5" strokeWidth={3} /> Добавить в «Смотреть вечером»
              </button>
              <button onClick={() => setResult(null)} className="w-full h-[40px] text-[#666] text-[13px] font-medium hover:text-white transition-colors">
                Поиск другого фильма
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- ADD HABIT VIEW ---
function AddHabitView({ onClose, onSave }: { onClose: () => void; onSave: (h: { name: string; frequency: string; iconId: string; days: number[] }) => void }) {
  const [name, setName] = useState(''); const [freq, setFreq] = useState('daily'); 
  const [selectedIcon, setSelectedIcon] = useState('target'); const [selectedDays, setSelectedDays] = useState([3]);

  const toggleDay = (d: number) => setSelectedDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);
  const handleSave = () => { if (!name.trim()) return; onSave({ name, frequency: freq, iconId: selectedIcon, days: selectedDays }); };
  const TopIcon = HABIT_ICONS.find(i => i.id === selectedIcon)?.icon || Target;

  return (
    <div className="flex flex-col h-full relative z-30 bg-black animate-slide-up">
      <div className="px-3 pt-10 pb-2 flex items-center justify-between z-10 border-b border-[#111]">
        <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center bg-[#0A0A0C] border border-[#1A1A1E]"><X className="w-3.5 h-3.5 text-[#8E8E93]" /></button>
        <span className="absolute left-0 right-0 text-center text-[13px] font-bold text-white tracking-wide uppercase pointer-events-none">Новая привычка</span>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar px-3 pb-24">
        <div className="flex justify-center mt-4 mb-5">
          <div className="w-[54px] h-[54px] rounded-[16px] bg-[#2A200A] border border-[#4A3A1A] flex items-center justify-center shadow-[inset_0_1px_4px_rgba(255,255,255,0.1),0_0_20px_rgba(245,195,71,0.15)]">
            <TopIcon className="w-7 h-7 text-[#F5C347] drop-shadow-[0_0_8px_rgba(245,195,71,0.5)]" strokeWidth={1.5} />
          </div>
        </div>

        <div className="mb-4">
          <span className="text-[9px] font-bold text-[#666] tracking-widest uppercase mb-1.5 block ml-1">Название</span>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Привычка" className="w-full bg-[#0A0A0C] border border-[#1A1A1E] rounded-[12px] p-3 text-white text-[14px] font-medium outline-none placeholder-[#444] shadow-inner" />
        </div>

        <div className="mb-4">
          <span className="text-[9px] font-bold text-[#666] tracking-widest uppercase mb-1.5 block ml-1">Частота</span>
          <div className="flex gap-1.5">
            {['daily', 'weekly', 'once'].map(f => (
              <button key={f} onClick={() => setFreq(f)} className={`flex-1 py-2 rounded-[10px] text-[11px] font-bold uppercase tracking-wider transition-all ${freq === f ? 'bg-[#142A1E] border border-[#1D402B] text-[#4ADE80] shadow-[0_0_10px_rgba(74,222,128,0.2)]' : 'bg-[#0A0A0C] border border-[#1A1A1E] text-[#555]'}`}>
                {f === 'daily' ? 'Ежедн' : f === 'weekly' ? 'Еженед' : 'Разово'}
              </button>
            ))}
          </div>
        </div>

        {(freq === 'weekly' || freq === 'daily') && (
          <div className="mb-5">
            <span className="text-[9px] font-bold text-[#666] tracking-widest uppercase mb-1.5 block ml-1">Дни</span>
            <div className="flex justify-between gap-1">
              {[1,2,3,4,5,6,7].map(d => (
                <button key={d} onClick={() => toggleDay(d)} className={`w-8 h-8 rounded-[10px] flex items-center justify-center text-[12px] font-bold transition-all ${selectedDays.includes(d) ? 'bg-[#142A1E] border border-[#1D402B] text-[#4ADE80] shadow-[0_0_8px_rgba(74,222,128,0.2)]' : 'bg-[#0A0A0C] border border-[#1A1A1E] text-[#555]'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <span className="text-[9px] font-bold text-[#666] tracking-widest uppercase mb-2 block ml-1">Иконка</span>
          <div className="grid grid-cols-5 gap-y-3 gap-x-1.5">
            {HABIT_ICONS.map(item => {
              const IconComp = item.icon; const isSel = selectedIcon === item.id;
              return (
                <button key={item.id} onClick={() => setSelectedIcon(item.id)} className="flex flex-col items-center gap-1">
                  <div className={`w-[44px] h-[44px] rounded-[14px] flex items-center justify-center transition-all ${isSel ? 'bg-[#2A200A] border border-[#4A3A1A] shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_0_10px_rgba(245,195,71,0.2)] scale-105' : 'bg-[#0A0A0C] border border-[#16161A]'}`}>
                    <IconComp className={`w-4 h-4 ${isSel ? 'text-[#F5C347] drop-shadow-[0_0_4px_rgba(245,195,71,0.6)]' : 'text-[#555]'}`} strokeWidth={1.5} />
                  </div>
                  <span className={`text-[8px] uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis max-w-[40px] ${isSel ? 'text-[#F5C347] font-bold' : 'text-[#444] font-medium'}`}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3 bg-black border-t border-[#111]">
        <button onClick={handleSave} disabled={!name} className={`w-full h-[46px] rounded-[14px] font-bold text-[13px] uppercase tracking-wide transition-all ${name ? 'bg-white text-black active:bg-[#ccc] shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-[#111] text-[#444]'}`}>
          Сохранить
        </button>
      </div>
    </div>
  );
}

// --- ADD TRANSACTION VIEW ---
function AddTransactionView({ onClose, onSave }: { onClose: () => void; onSave: (tx: Transaction) => void }) {
  const [type, setType] = useState<'income' | 'expense'>('expense'); const [amountStr, setAmountStr] = useState('0');
  const handleNumpad = (val: string) => { if (val === 'clear') setAmountStr(p => p.length > 1 ? p.slice(0, -1) : '0'); else setAmountStr(p => (p === '0' && val !== ',' && !isNaN(Number(val))) ? val : (p.length > 10 ? p : p + val)); };
  const handleSave = () => { let finalAmount = parseFloat(amountStr.replace(/,/g, '.').replace(/\D/g, '')) || 0; if (finalAmount <= 0) return; onSave({ id: Date.now(), type, amount: finalAmount, category: type === 'expense' ? 'Расход' : 'Доход', date: new Date().toISOString(), note: '' }); };
  
  return (
    <div className="flex flex-col h-full relative z-30 bg-black animate-slide-up">
      <div className="px-3 pt-10 pb-2 flex justify-between items-center z-10 relative border-b border-[#111]">
        <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center bg-[#0A0A0C] border border-[#1A1A1E]"><X className="w-3.5 h-3.5 text-[#8E8E93]" /></button>
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center bg-[#0A0A0C] border border-[#16161A] rounded-full p-0.5 shadow-sm">
          <button onClick={() => setType('expense')} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${type === 'expense' ? 'bg-[#3A1414] border border-[#5A1A1A] text-[#FF453A] shadow-[0_0_8px_rgba(255,69,58,0.2)]' : 'text-[#555]'}`}>Расход</button>
          <button onClick={() => setType('income')} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${type === 'income' ? 'bg-[#142A1E] border border-[#1D402B] text-[#4ADE80] shadow-[0_0_8px_rgba(74,222,128,0.2)]' : 'text-[#555]'}`}>Доход</button>
        </div>
        <button className="w-7 h-7 rounded-full flex items-center justify-center bg-[#0A0A0C] border border-[#1A1A1E]"><MoreVertical className="w-3.5 h-3.5 text-[#8E8E93]" /></button>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center min-h-[40px]">
        <div className={`text-[46px] font-bold tracking-tight px-4 text-center drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)] ${type === 'income' ? 'text-[#4ADE80] drop-shadow-[0_0_15px_rgba(74,222,128,0.3)]' : 'text-white'}`}>{amountStr} <span className="font-medium text-[36px] opacity-50">₸</span></div>
      </div>
      
      <div className="px-3 pb-3">
        <div className="flex items-center gap-1.5 mb-2.5">
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-[10px] bg-[#0A0A0C] border border-[#16161A]">
            <div className="w-3 h-3 rounded-sm bg-[#142A1E] flex items-center justify-center"><Wallet className="w-2 h-2 text-[#4ADE80]" /></div>
            <span className="text-[10px] font-medium text-[#8E8E93] uppercase tracking-wide">Кошелек</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-[10px] bg-[#0A0A0C] border border-[#16161A]">
            <Calendar className="w-3 h-3 text-[#FF453A]" /><span className="text-[10px] font-medium text-[#8E8E93] uppercase tracking-wide">Сегодня</span>
          </div>
        </div>
        <div className="mb-2.5 border-b border-[#1A1A1E] pb-2">
          <input type="text" placeholder="Заметка..." className="w-full bg-transparent text-[12px] font-medium text-white placeholder-[#444] outline-none" />
        </div>
        
        <div className="grid grid-cols-4 gap-1">
          {['1', '2', '3', '+', '4', '5', '6', '-', '7', '8', '9', '×', ',', '0', 'clear', '÷'].map(btn => (
            <button key={btn} onClick={() => handleNumpad(btn)} className="h-[42px] rounded-[12px] text-[18px] font-medium text-[#E0E0E0] bg-[#0A0A0C] border border-[#16161A] active:bg-[#111] flex items-center justify-center shadow-[0_2px_5px_rgba(0,0,0,0.5)]">
              {btn === 'clear' ? <Delete className="w-4 h-4 text-[#555]" /> : btn}
            </button>
          ))}
        </div>
        <button onClick={handleSave} className="w-full bg-white text-black font-bold uppercase tracking-wide text-[13px] py-[12px] rounded-[14px] mt-2 shadow-[0_0_15px_rgba(255,255,255,0.2)] active:bg-[#ddd]">Сохранить</button>
      </div>
    </div>
  );
}

// --- SCAN VIEW ---
function ScanView({ onClose, onProcess }: { onClose: () => void; onProcess: (file: File) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col h-full w-full absolute inset-0 bg-black z-40 animate-slide-up">
      <input type="file" accept="image/*" ref={fileInputRef} onChange={e => { if(e.target.files?.[0]) { onClose(); onProcess(e.target.files[0]); } }} className="hidden" />
      <div className="px-3 pt-10 pb-2 flex items-center justify-between relative z-10 border-b border-[#111]">
        <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center bg-[#0A0A0C] border border-[#1A1A1E]"><X className="w-3.5 h-3.5 text-[#8E8E93]" /></button>
        <span className="absolute left-0 right-0 text-center text-[13px] font-bold text-white uppercase tracking-wide pointer-events-none">Сканер</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center mt-[-5vh]">
        <div className="w-[80px] h-[80px] rounded-[24px] bg-[#050505] border border-[#111] flex items-center justify-center mb-5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8),0_0_20px_rgba(74,222,128,0.05)]"><Receipt className="w-8 h-8 text-[#333]" /></div>
        <h2 className="text-[15px] font-bold text-white mb-1 tracking-wide">ФОТО ЧЕКА</h2>
        <p className="text-[10px] text-[#555] font-medium uppercase tracking-widest">Товары разделятся</p>
      </div>
      <div className="px-3 pb-6 flex gap-2">
        <button onClick={() => fileInputRef.current?.click()} className="flex-1 h-[48px] rounded-[14px] bg-white text-black flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.2)] active:bg-[#ddd] transition-colors">
          <Camera className="w-4 h-4 text-black" strokeWidth={2} /><span className="text-[12px] font-bold uppercase tracking-wide">Камера / Галерея</span>
        </button>
      </div>
    </div>
  );
}
