export interface ConsoleCommand {
  command: string;
  defaultValue: string;
  description: string;
  type: string;
}

export async function getConsoleCommands(): Promise<ConsoleCommand[]> {
  const response = await fetch("/consoleCommands.json");
  if (!response.ok) {
    throw new Error("Failed to fetch console commands");
  }

  return response.json();
}
