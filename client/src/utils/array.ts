export function joinWithAnd<T>(a: T[], separator = ", ", lastSeparator = " and "): string {
  const arr = [...a];
  if (arr.length === 0) return "";
  if (arr.length === 1) return String(arr[0]);
  if (arr.length === 2) return `${arr[0]}${lastSeparator}${arr[1]}`;

  const lastItem = arr.pop();
  return `${arr.join(separator)}${lastSeparator}${lastItem}`;
}
