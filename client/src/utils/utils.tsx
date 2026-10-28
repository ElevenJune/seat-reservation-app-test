  const dateOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric"
  };
  export function formatDate(date: Date): string {
    const formattedDate: string = new Date(date).toLocaleDateString("FR", dateOptions);
    return formattedDate;
  }