import { Inngest, eventType, staticSchema } from "inngest";

export const inngest = new Inngest({ id: "eventflow" });

export const timerStartedEvent = eventType("timer/started", {
  schema: staticSchema<{
    roomId: string;
    targetIndex: number;
    durationSeconds: number;
    startTime: number | null;
  }>(),
});

export const timerPausedEvent = eventType("timer/paused", {
  schema: staticSchema<{ roomId: string }>(),
});

export const timerStoppedEvent = eventType("timer/stopped", {
  schema: staticSchema<{ roomId: string }>(),
});
