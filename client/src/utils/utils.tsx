
  const dateOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric"
  };
  export function formatDate(date: Date): string {
    const formattedDate: string = new Date(date).toLocaleDateString("FR", dateOptions);
    return formattedDate;
  }

export function getOrCreateSessionId(): string {
  let sessionId = localStorage.getItem('app_session_id');
  
  if (!sessionId) {
    sessionId = crypto.randomUUID ? crypto.randomUUID() : 'sess_' + Math.random().toString(36).substring(2);
    localStorage.setItem('app_session_id', sessionId);
  }
  
  return sessionId;
}