'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';
// import { useLanguage } from '@/lib/context/LanguageContext';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { collection, query, where, getDocs, orderBy, setDoc, Timestamp, doc } from 'firebase/firestore';

// Kelime Grubu tipi tanımlaması
interface WordGroup {
  id: string;
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  category: 'daily' | 'business' | 'travel' | 'academic';
  wordCount: number;
  creator: string;
}

// Kelime öğrenme durumu tipi
interface WordLearningStatus {
  wordId: string;
  lastReviewed: Date;
  nextReview: Date;
  difficulty: 'easy' | 'medium' | 'hard';
  reviewCount: number;
}

// Kelime tipi
interface Word {
  id: string;
  english: string;
  turkish: string;
  example?: string;
  pronunciation?: string;
  imageUrl?: string;
}

export default function VocabularyPage() {
  const router = useRouter();
  
  // Kelime öğrenme için state'ler
  const [selectedWordGroup, setSelectedWordGroup] = useState<string | null>(null);
  const [groupWords, setGroupWords] = useState<Array<Word & { imageUrl: string }>>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [wordLearningStatus, setWordLearningStatus] = useState<WordLearningStatus[]>([]);
  
  // Kelime grupları için state'ler
  const [allWordGroups, setAllWordGroups] = useState<WordGroup[]>([]);
  const [filteredWordGroups, setFilteredWordGroups] = useState<WordGroup[]>([]);
  const [levelFilter, setLevelFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Firebase'den kullanıcı bilgisi ve kelime durumunu yükle
  useEffect(() => {
    const loadData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          await Promise.all([
            fetchWordGroups(),
            loadWordLearningStatus(user.uid)
          ]);
        }
        setLoading(false);
      } catch (err) {
        console.error('Veri yüklenirken hata:', err);
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Kelime öğrenme durumlarını yükle
  const loadWordLearningStatus = async (userId: string) => {
    if (!userId) return;
    
    try {
      const statusRef = collection(db, 'wordLearningStatus');
      const q = query(
        statusRef, 
        where('userId', '==', userId),
        orderBy('nextReview', 'asc')
      );
      const querySnapshot = await getDocs(q);
      
      const statuses = querySnapshot.docs.map(doc => ({
        wordId: doc.data().wordId,
        difficulty: doc.data().difficulty,
        lastReviewed: doc.data().lastReviewed.toDate(),
        nextReview: doc.data().nextReview.toDate(),
        reviewCount: doc.data().reviewCount
      }));
      
      // Sıralı olarak tekrarlanacak kelimeleri göster
      const now = new Date();
      const upcomingReviews = statuses.filter(status => status.nextReview > now);
      const dueReviews = statuses.filter(status => status.nextReview <= now);
      
      // Önce tekrar zamanı gelmiş olanları, sonra gelecek olanları birleştir
      setWordLearningStatus([...dueReviews, ...upcomingReviews]);
    } catch (error) {
      console.error('Kelime durumları yüklenirken hata oluştu:', error);
    }
  };
  
  // Firebase'den kelime gruplarını getir
  const fetchWordGroups = async () => {
    try {
      // Kelime gruplarını Firebase'den sorgula
      const wordGroupsQuery = query(
        collection(db, 'wordGroups'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(wordGroupsQuery);
      const groups: WordGroup[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        groups.push({ 
          id: doc.id, 
          title: data.title || '',
          description: data.description || '',
          level: data.level || 'beginner',
          category: data.category || 'daily',
          wordCount: data.wordCount || 0,
          creator: data.creator || 'SpeakNest'
        });
      });
      
      console.log('Kelime grupları yüklendi:', groups.length);
      setAllWordGroups(groups);
      setFilteredWordGroups(groups);
    } catch (error) {
      console.error('Kelime grupları getirilirken hata oluştu:', error);
    }
  };
  
  // Filtreleme fonksiyonu
  const applyFilters = (level: string, category: string, search: string) => {
    let filtered = [...allWordGroups];
    
    // Seviye filtresi
    if (level) {
      filtered = filtered.filter(group => group.level === level);
    }
    
    // Kategori filtresi
    if (category) {
      filtered = filtered.filter(group => group.category === category);
    }
    
    // Arama filtresi
    if (search) {
      filtered = filtered.filter(group => 
        group.title.toLowerCase().includes(search.toLowerCase()) || 
        group.description.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    setFilteredWordGroups(filtered);
    
    // Filtreleri state'lere kaydet
    setLevelFilter(level);
    setCategoryFilter(category);
    setSearchFilter(search);
  };
  
  // Kelime grubuna ait kelimeleri getir
  const fetchGroupWords = async (groupId: string) => {
    try {
      const wordsRef = collection(db, 'wordGroups', groupId, 'words');
      const wordsSnapshot = await getDocs(wordsRef);
      const words = wordsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Array<Word & { imageUrl: string }>;
      
      setGroupWords(words);
      setCurrentWordIndex(0);
    } catch (error) {
      console.error('Kelimeler getirilirken hata oluştu:', error);
    }
  };

  // Component başlangıcında speechSynthesis'i hazırla
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const synth = window.speechSynthesis;
      
      // API'yi hazırla
      const prepareSynthesis = () => {
        // Boş bir utterance oluştur ve çal
        const utterance = new SpeechSynthesisUtterance('');
        utterance.lang = 'en-US';
        synth.speak(utterance);
        synth.cancel(); // Hemen iptal et
      };

      // Sayfa yüklendiğinde hazırla
      if (synth.getVoices().length > 0) {
        prepareSynthesis();
      } else {
        // Sesler yüklenene kadar bekle
        synth.onvoiceschanged = prepareSynthesis;
      }
    }
  }, []);

  const speakWord = (text: string, lang: string = 'en-US') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      utterance.onstart = () => {
        setIsSpeaking(true);
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      
      utterance.onerror = () => {
        setIsSpeaking(false);
      };
      
      window.speechSynthesis.speak(utterance);
    }
  };

  // updateWordLearningStatus fonksiyonunu ekle
  const updateWordLearningStatus = async (wordId: string, difficulty: 'easy' | 'medium' | 'hard') => {
    const user = auth.currentUser;
    if (!user?.uid) {
      console.error('Kullanıcı girişi yapılmamış');
      return;
    }

    // Eğer kelime zaten kaydedilmişse, güncelle
    const existingStatus = wordLearningStatus.find(status => status.wordId === wordId);
    if (existingStatus) {
      return;
    }

    const now = new Date();
    const nextReviewDate = new Date();
    
    switch(difficulty) {
      case 'hard':
        nextReviewDate.setDate(now.getDate() + 1);
        break;
      case 'medium':
        nextReviewDate.setDate(now.getDate() + 3);
        break;
      case 'easy':
        nextReviewDate.setDate(now.getDate() + 7);
        break;
    }

    try {
      const wordRef = doc(db, 'wordLearningStatus', `${user.uid}_${wordId}`);
      await setDoc(wordRef, {
        userId: user.uid,
        wordId,
        difficulty,
        lastReviewed: Timestamp.fromDate(now),
        nextReview: Timestamp.fromDate(nextReviewDate),
        reviewCount: 1,
        createdAt: Timestamp.fromDate(now)
      }, { merge: true });

      setWordLearningStatus(prev => [...prev, {
        wordId,
        lastReviewed: now,
        nextReview: nextReviewDate,
        difficulty,
        reviewCount: 1
      }]);
    } catch (error) {
      console.error('Kelime durumu güncellenirken hata oluştu:', error);
    }
  };

  // Kelime öğrenme kartı bileşeni
  const WordCard = ({ word, onNext, onPrevious, isFirst, isLast }: { 
    word: Word & { imageUrl: string }, 
    onNext: () => void, 
    onPrevious: () => void,
    isFirst: boolean,
    isLast: boolean
  }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard' | null>(null);

    return (
      <div className="w-full max-w-2xl mx-auto p-4">
        {/* İlerleme Göstergesi */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
            style={{ width: `${(currentWordIndex / groupWords.length) * 100}%` }}
          ></div>
        </div>

        <div className="relative w-full h-[300px] md:h-[500px] perspective-1000">
          <div 
            className="absolute w-full h-full transition-transform duration-500"
            onClick={() => setIsFlipped(!isFlipped)}
            style={{ 
              perspective: '1000px',
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}
          >
            {/* Ön Yüz - İngilizce kelime */}
            <div 
              className="absolute w-full h-full"
              style={{ 
                backfaceVisibility: 'hidden',
                transform: 'rotateY(0deg)',
                opacity: isFlipped ? 0 : 1,
                transition: 'opacity 0.3s'
              }}
            >
              <div className="w-full h-full bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
                <div className="p-8 h-full flex flex-col justify-center items-center">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <h2 className="text-4xl font-bold text-gray-800">{word.english}</h2>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          speakWord(word.english);
                        }}
                        className="p-3 rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all transform hover:scale-110 flex items-center justify-center"
                        title="Seslendir"
                      >
                        {isSpeaking ? (
                          <div className="w-8 h-8 border-2 border-blue-800 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                          </svg>
                        )}
                      </button>
                    </div>
                    {word.pronunciation && (
                      <p className="text-xl text-gray-600 italic mb-6">
                        /{word.pronunciation}/
                      </p>
                    )}
                    {word.imageUrl && (
                      <div className="mb-6">
                        <img 
                          src={word.imageUrl} 
                          alt={word.english}
                          className="max-h-48 mx-auto rounded-lg shadow-md"
                        />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFlipped(true);
                    }}
                    className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all transform hover:scale-105"
                  >
                    Türkçe Anlamı Göster
                  </button>
                </div>
              </div>
            </div>

            {/* Arka Yüz - Türkçe anlamı */}
            <div 
              className="absolute w-full h-full"
              style={{ 
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                opacity: isFlipped ? 1 : 0,
                transition: 'opacity 0.3s'
              }}
            >
              <div className="w-full h-full bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
                <div className="p-8 h-full flex flex-col justify-center items-center">
                  <div className="text-center">
                    <h2 className="text-3xl font-bold text-gray-800 mb-4">
                      {word.turkish}
                    </h2>
                    {word.example && (
                      <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                        <p className="text-xl text-gray-700 italic">
                          {word.example}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Zorluk Seviyesi Butonları */}
                  <div className="mt-8 flex gap-4 justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDifficulty('hard');
                        updateWordLearningStatus(word.id, 'hard');
                      }}
                      className={`flex-1 px-6 py-3 rounded-lg ${
                        selectedDifficulty === 'hard' 
                          ? 'bg-red-600 text-white' 
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      } focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all transform hover:scale-105 flex items-center justify-center gap-2`}
                    >
                      <AlertCircle className="w-5 h-5" />
                      <span>Zor</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDifficulty('medium');
                        updateWordLearningStatus(word.id, 'medium');
                      }}
                      className={`flex-1 px-6 py-3 rounded-lg ${
                        selectedDifficulty === 'medium' 
                          ? 'bg-yellow-600 text-white' 
                          : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      } focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-all transform hover:scale-105 flex items-center justify-center gap-2`}
                    >
                      <Clock className="w-5 h-5" />
                      <span>Orta</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDifficulty('easy');
                        updateWordLearningStatus(word.id, 'easy');
                      }}
                      className={`flex-1 px-6 py-3 rounded-lg ${
                        selectedDifficulty === 'easy' 
                          ? 'bg-green-600 text-white' 
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      } focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all transform hover:scale-105 flex items-center justify-center gap-2`}
                    >
                      <CheckCircle className="w-5 h-5" />
                      <span>Kolay</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigasyon Butonları */}
        <div className="flex justify-between mt-6">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isFirst) {
                onPrevious();
                setIsFlipped(false);
              }
            }}
            className={`px-4 py-2 rounded ${
              isFirst
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            disabled={isFirst}
          >
            Önceki
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!selectedDifficulty) {
                alert('Lütfen önce zorluk seviyesini seçin');
                return;
              }
              
              if (isLast) {
                // Ana sayfaya dön
                setSelectedWordGroup(null);
                setGroupWords([]);
                setCurrentWordIndex(0);
              } else {
                // Sonraki kelimeye geç
                onNext();
                setIsFlipped(false);
                setSelectedDifficulty(null);
              }
            }}
            className={`px-4 py-2 rounded ${
              !selectedDifficulty
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            disabled={!selectedDifficulty}
          >
            {isLast ? 'Bitir' : 'Sonraki'}
          </button>
        </div>
      </div>
    );
  };

  // Kelime öğrenme sayfası içeriği
  const renderVocabularyContent = () => {
    if (!selectedWordGroup) {
      return (
        <div className="space-y-6">
          {/* Tekrar Durumu Özeti */}
          <div className="bg-white rounded-xl shadow-lg p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800">Tekrar Durumu</h3>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                {wordLearningStatus.length} Toplam Kelime
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { key: 'hard', label: 'Zor', icon: <AlertCircle className="w-5 h-5" />, color: 'red' },
                { key: 'medium', label: 'Orta', icon: <Clock className="w-5 h-5" />, color: 'amber' },
                { key: 'easy', label: 'Kolay', icon: <CheckCircle className="w-5 h-5" />, color: 'emerald' }
              ].map(({ key, label, icon, color }) => {
                const words = wordLearningStatus.filter(status => status.difficulty === key);
                const dueWords = words.filter(status => new Date(status.nextReview) <= new Date());
                const upcomingWords = words.filter(status => new Date(status.nextReview) > new Date());
                const totalCount = words.length;
                const duePercentage = totalCount > 0 ? (dueWords.length / totalCount) * 100 : 0;
                
                const colorClass = {
                  red: {
                    bg: 'bg-red-400',
                    light: 'bg-red-100',
                    text: 'text-red-700',
                    border: 'border-red-200',
                    darkText: 'text-red-800',
                    lightBg: 'bg-red-50'
                  },
                  amber: {
                    bg: 'bg-amber-400',
                    light: 'bg-amber-100',
                    text: 'text-amber-700',
                    border: 'border-amber-200',
                    darkText: 'text-amber-800',
                    lightBg: 'bg-amber-50'
                  },
                  emerald: {
                    bg: 'bg-emerald-400',
                    light: 'bg-emerald-100',
                    text: 'text-emerald-700',
                    border: 'border-emerald-200',
                    darkText: 'text-emerald-800',
                    lightBg: 'bg-emerald-50'
                  }
                }[color as 'red' | 'amber' | 'emerald'] || {
                  bg: 'bg-gray-400',
                  light: 'bg-gray-100',
                  text: 'text-gray-700',
                  border: 'border-gray-200',
                  darkText: 'text-gray-800',
                  lightBg: 'bg-gray-50'
                };

                return (
                  <div 
                    key={key} 
                    className={`rounded-xl p-5 border ${colorClass.border} ${colorClass.lightBg} transition-all duration-300 hover:shadow-md`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-full ${colorClass.light} ${colorClass.text}`}>
                          {icon}
                        </div>
                        <span className="font-medium text-gray-800">{label}</span>
                      </div>
                      <span className={`font-semibold text-xl ${colorClass.darkText}`}>{words.length}</span>
                    </div>
                    
                    {/* İlerleme çubuğu */}
                    <div className="w-full h-2 bg-gray-200 rounded-full mb-3">
                      <div 
                        className={`h-2 ${colorClass.bg} rounded-full`} 
                        style={{ width: `${duePercentage}%` }}
                      ></div>
                    </div>
                    
                    {dueWords.length > 0 ? (
                      <div className="mb-3 flex items-start">
                        <div className={`p-1.5 rounded-full ${colorClass.light} ${colorClass.text} mr-2 mt-0.5`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 2h4"></path><path d="M12 14v-4"></path><circle cx="12" cy="14" r="8"></circle>
                          </svg>
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${colorClass.darkText}`}>
                            {dueWords.length} kelime tekrar zamanı geldi!
                          </p>
                          <p className="text-xs text-gray-500">
                            Hemen tekrar etmelisiniz
                          </p>
                        </div>
                      </div>
                    ) : null}
                    
                    {upcomingWords.length > 0 ? (
                      <div className="flex items-start">
                        <div className={`p-1.5 rounded-full ${colorClass.light} ${colorClass.text} mr-2 mt-0.5`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 8v4l3 3"></path><circle cx="12" cy="12" r="10"></circle>
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-gray-700">
                            {upcomingWords.length} kelime beklemede
                          </p>
                          {upcomingWords.length > 0 && (
                            <p className="text-xs text-gray-500">
                              En yakın: {new Date(Math.min(...upcomingWords.map(w => w.nextReview.getTime()))).toLocaleDateString('tr-TR')}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : null}
                    
                    {words.length === 0 && (
                      <div className="flex items-center justify-center h-16">
                        <p className="text-sm text-gray-500">
                          Henüz kelime eklenmemiş
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-1.5 text-gray-500" />
                  <span>Son güncelleme: {new Date().toLocaleDateString('tr-TR')}</span>
                </div>
                
                {wordLearningStatus.some(status => new Date(status.nextReview) <= new Date()) && (
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
                    Tüm Tekrarları Başlat
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Kelime Grubu Listesi */}
          <div className="bg-white rounded-xl shadow-lg p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800">Kelime Grupları</h3>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                {filteredWordGroups.length} Toplam Kelime Grubu
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWordGroups.map((group) => (
                <div
                  key={group.id}
                  className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-300 cursor-pointer"
                  onClick={() => {
                    setSelectedWordGroup(group.id);
                    fetchGroupWords(group.id);
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-800">{group.title}</span>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">{group.wordCount} kelime</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{group.description}</p>
                  <div className="flex justify-between items-center text-xs">
                    <span className={`px-2 py-1 rounded-full ${
                      group.level === 'beginner' ? 'bg-green-100 text-green-800' :
                      group.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {group.level === 'beginner' ? 'Başlangıç' :
                       group.level === 'intermediate' ? 'Orta' : 'İleri'}
                    </span>
                    <span className={`px-2 py-1 rounded-full ${
                      group.category === 'daily' ? 'bg-purple-100 text-purple-800' :
                      group.category === 'business' ? 'bg-indigo-100 text-indigo-800' :
                      group.category === 'travel' ? 'bg-pink-100 text-pink-800' :
                      'bg-teal-100 text-teal-800'
                    }`}>
                      {group.category === 'daily' ? 'Günlük' :
                       group.category === 'business' ? 'İş' :
                       group.category === 'travel' ? 'Seyahat' : 'Akademik'}
                    </span>
                  </div>
                </div>
              ))}
              
              {filteredWordGroups.length === 0 && (
                <div className="col-span-3 flex items-center justify-center h-40">
                  <p className="text-gray-500">Hiçbir kelime grubu bulunamadı. Filtreleri değiştirmeyi deneyin.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Geri Dönüş Butonu */}
        <div className="flex justify-between items-center">
          <button 
            onClick={() => {
              setSelectedWordGroup(null);
              setGroupWords([]);
              setCurrentWordIndex(0);
            }}
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Kelime Gruplarına Dön
          </button>
          <span className="text-sm text-gray-500">
            {currentWordIndex + 1} / {groupWords.length} Kelime
          </span>
        </div>

        {/* Seçilen Kelime Grubu Bilgisi */}
        <div className="bg-white rounded-xl shadow-lg p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-800">
              {allWordGroups.find(g => g.id === selectedWordGroup)?.title || 'Kelime Grubu'}
            </h3>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
              {groupWords.length} Toplam Kelime
            </span>
          </div>
          
          {groupWords.length > 0 ? (
            <WordCard
              word={groupWords[currentWordIndex]}
              onNext={() => {
                if (currentWordIndex < groupWords.length - 1) {
                  setCurrentWordIndex(currentWordIndex + 1);
                }
              }}
              onPrevious={() => {
                if (currentWordIndex > 0) {
                  setCurrentWordIndex(currentWordIndex - 1);
                }
              }}
              isFirst={currentWordIndex === 0}
              isLast={currentWordIndex === groupWords.length - 1}
            />
          ) : (
            <div className="flex items-center justify-center h-40">
              <p className="text-gray-500">Bu kelime grubunda henüz kelime bulunmuyor.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Kelime Öğren</h2>
        </div>
        
        {/* Filtreleme Sistemi */}
        <div className="px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-grow">
              <input 
                type="text" 
                placeholder="Kelime grubu ara..." 
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                onChange={(e) => {
                  // Arama filtresini uygula
                  const searchText = e.target.value.toLowerCase();
                  setSearchFilter(searchText);
                  applyFilters(levelFilter, categoryFilter, searchText);
                }}
              />
              <div className="absolute left-3 top-2.5 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </div>
            </div>
            <div className="flex gap-3">
              <select 
                className="py-2 px-3 rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                onChange={(e) => {
                  // Seviye filtresini uygula
                  const selectedLevel = e.target.value;
                  setLevelFilter(selectedLevel);
                  applyFilters(selectedLevel, categoryFilter, searchFilter);
                }}
              >
                <option value="">Tüm Seviyeler</option>
                <option value="beginner">Başlangıç</option>
                <option value="intermediate">Orta</option>
                <option value="advanced">İleri</option>
              </select>
              <select 
                className="py-2 px-3 rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                onChange={(e) => {
                  // Kategori filtresini uygula
                  const selectedCategory = e.target.value;
                  setCategoryFilter(selectedCategory);
                  applyFilters(levelFilter, selectedCategory, searchFilter);
                }}
              >
                <option value="">Tüm Kategoriler</option>
                <option value="daily">Günlük Konuşma</option>
                <option value="business">İş İngilizcesi</option>
                <option value="travel">Seyahat</option>
                <option value="academic">Akademik</option>
              </select>
            </div>
          </div>
          
          {/* Aktif Filtreler */}
          <div className="mt-3 flex flex-wrap gap-2">
            {(levelFilter || categoryFilter || searchFilter) && (
              <div className="w-full">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span>Aktif Filtreler:</span>
                  
                  {levelFilter && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                      {levelFilter === 'beginner' ? 'Başlangıç' : 
                        levelFilter === 'intermediate' ? 'Orta' : 
                        levelFilter === 'advanced' ? 'İleri' : levelFilter}
                      <button 
                        onClick={() => {
                          setLevelFilter('');
                          applyFilters('', categoryFilter, searchFilter);
                        }} 
                        className="ml-1 text-emerald-600 hover:text-emerald-900"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  )}
                  
                  {categoryFilter && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {categoryFilter === 'daily' ? 'Günlük Konuşma' : 
                        categoryFilter === 'business' ? 'İş İngilizcesi' : 
                        categoryFilter === 'travel' ? 'Seyahat' : 
                        categoryFilter === 'academic' ? 'Akademik' : categoryFilter}
                      <button 
                        onClick={() => {
                          setCategoryFilter('');
                          applyFilters(levelFilter, '', searchFilter);
                        }} 
                        className="ml-1 text-blue-600 hover:text-blue-900"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  )}
                  
                  {searchFilter && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      &quot;{searchFilter}&quot;
                      <button 
                        onClick={() => {
                          setSearchFilter('');
                          applyFilters(levelFilter, categoryFilter, '');
                          // Arama input alanını temizle
                          const searchInput = document.querySelector('input[placeholder="Kelime grubu ara..."]') as HTMLInputElement;
                          if (searchInput) searchInput.value = '';
                        }} 
                        className="ml-1 text-purple-600 hover:text-purple-900"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  )}
                  
                  {(levelFilter || categoryFilter || searchFilter) && (
                    <button 
                      onClick={() => {
                        setLevelFilter('');
                        setCategoryFilter('');
                        setSearchFilter('');
                        setFilteredWordGroups(allWordGroups);
                        // Arama input alanını temizle
                        const searchInput = document.querySelector('input[placeholder="Kelime grubu ara..."]') as HTMLInputElement;
                        if (searchInput) searchInput.value = '';
                        // Select'leri sıfırla
                        const selects = document.querySelectorAll('select') as NodeListOf<HTMLSelectElement>;
                        selects.forEach(select => select.value = '');
                      }}
                      className="text-xs text-slate-500 hover:text-slate-700 underline ml-2"
                    >
                      Tüm filtreleri temizle
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Kelime Öğrenme İçeriği */}
        <div className="p-6">
          {renderVocabularyContent()}
        </div>
      </div>
    </div>
  );
} 