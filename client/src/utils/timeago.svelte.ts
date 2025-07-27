import { format } from "timeago.js";

export const useTimeAgo = (initialValue: Date | null = null, updateInterval: number = 1000) => {
  let date = $state(initialValue);
  let formattedDate = $state(date ? format(date) : "");

  $effect(() => {
    const interval = setInterval(() => {
      if (date) {
        formattedDate = format(date.getTime(), undefined, { minInterval: 1 });
      }
    }, updateInterval);

    return () => clearInterval(interval);
  });

  return {
    setDate(newDate: Date | null) {
      date = newDate;
      formattedDate = newDate ? format(newDate) : "";
    },
    get date() {
      return date;
    },
    get formattedDate() {
      return formattedDate;
    },
  };
};
