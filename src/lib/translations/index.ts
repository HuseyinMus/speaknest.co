import { Language } from '@/lib/context/LanguageContext';

// Bütün diller için çeviri anahtarları - tip güvenliği sağlamak için
export type TranslationKey = 
  | 'appName'
  | 'welcome'
  | 'login'
  | 'register'
  | 'dashboard'
  | 'home'
  | 'profile'
  | 'logout'
  | 'settings'
  | 'statistics'
  | 'student'
  | 'welcomeMessage'
  | 'todayMessage'
  | 'findMeeting'
  | 'quickMatch'
  | 'upcomingMeetings'
  | 'noUpcomingMeetings'
  | 'findConversationMeeting'
  | 'viewAllUpcomingPractices'
  | 'conversationMeetings'
  | 'practiceRooms'
  | 'upcomingPractices'
  | 'assignments'
  | 'popularPracticeRooms'
  | 'host'
  | 'notSpecified'
  | 'joinRoom'
  | 'noPracticeRooms'
  | 'viewAllPracticeRooms'
  | 'conversationHost'
  | 'myMeetings'
  | 'createMeeting'
  | 'participants'
  | 'evaluations'
  | 'loading'
  | 'error'
  | 'returnToLogin'
  | 'selectLanguage'
  | 'hostDayMessage'
  | 'createNewMeeting'
  | 'viewParticipants'
  | 'activeMeetings'
  | 'intermediateLevel'
  | 'dailyConversation'
  | 'date'
  | 'goToMeeting'
  | 'noActiveMeetings'
  | 'viewAllMeetings'
  | 'noUpcomingMeetingsScheduled'
  | 'scheduleMeeting'
  | 'sectionComingSoon'
  | 'userProfileNotFound'
  | 'profileDataError'
  | 'meetingsAccessError'
  | 'meetingsDataError'
  | 'sessionCheckError'
  | 'meetingTitle'
  | 'meetingTitlePlaceholder'
  | 'meetingDescription'
  | 'meetingDescriptionPlaceholder'
  | 'meetingDate'
  | 'meetingTime'
  | 'level'
  | 'topic'
  | 'minParticipants'
  | 'maxParticipants'
  | 'keywords'
  | 'keywordPlaceholder'
  | 'topicQuestions'
  | 'questionPlaceholder'
  | 'creating'
  | 'titleRequired'
  | 'dateTimeRequired'
  | 'futureDateRequired'
  | 'meetingCreateSuccess'
  | 'meetingCreateError'
  | 'createMeetingDescription'
  | 'beginnerLevel'
  | 'advancedLevel'
  | 'anyLevel'
  | 'business'
  | 'education'
  | 'science'
  | 'technology'
  | 'arts'
  | 'travel'
  | 'food'
  | 'sports'
  | 'health'
  | 'environment'
  | 'entertainment'
  | 'participantCount'
  | 'participantCountHelp'
  | 'participantCountError'
  | 'myMeetingsDescription'
  | 'level_beginner'
  | 'level_intermediate'
  | 'level_advanced'
  | 'level_any'
  | 'topic_daily'
  | 'topic_business'
  | 'topic_education'
  | 'topic_science'
  | 'topic_technology'
  | 'topic_arts'
  | 'topic_travel'
  | 'topic_food'
  | 'topic_sports'
  | 'topic_health'
  | 'topic_environment'
  | 'topic_entertainment'
  | 'edit'
  | 'noMeetingsYet'
  | 'scheduledStatus'
  | 'activeStatus'
  | 'completedStatus'
  | 'cancelledStatus'
  | 'meetingStatusPrefix'
  | 'meetUrl'
  | 'meetingLinkCopied'
  | 'googleMeetIntegration'
  | 'meetingWillBeActive'
  | 'meetingActiveNow'
  | 'copyMeetingLink'
  | 'joinMeeting'
  | 'about'
  | 'pricing'
  | 'contact'
  | 'hello'
  | 'user';

// Her dil için çeviriler ayrı dosyalarda tanımlanacak - daha kolay yönetim için
import { translations as trTranslations } from './tr';
import { translations as enTranslations } from './en';
import { translations as esTranslations } from './es';
import { translations as arTranslations } from './ar';
import { translations as deTranslations } from './de';

// Tüm diller için çevirileri birleştir
export const translations: Record<Language, Record<TranslationKey, string>> = {
  tr: trTranslations,
  en: enTranslations,
  es: esTranslations,
  ar: arTranslations,
  de: deTranslations
};

/**
 * Çeviri anahtarı için ilgili dilde çeviriyi döndürür
 * @param key Çeviri anahtarı
 * @param language Dil kodu
 * @param params Parametreler varsa
 * @returns Çevrilmiş metin
 */
export function translateKey(key: TranslationKey, language: Language, params?: Record<string, string>): string {
  // Belirtilen dil için çeviri varsa döndür, yoksa anahtarın kendisini döndür
  let translatedText = translations[language][key] || key;
  
  // Parametreler varsa, bunları çeviriye yerleştir
  if (params) {
    Object.keys(params).forEach(paramKey => {
      translatedText = translatedText.replace(`{${paramKey}}`, params[paramKey]);
    });
  }
  
  return translatedText;
} 