export type ModeId = "gridshot" | "microshot" | "flick" | "tracking" | "reaction" | "precision";
export type SessionState = "menu" | "countdown" | "playing" | "paused" | "results";
export interface SessionResult {
  id: string; mode: ModeId; date: number; duration: number; score: number;
  shots: number; hits: number; misses: number; accuracy: number; avgReaction: number;
}