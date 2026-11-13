export enum SseControlEvent {
    Done = "done",
    Error = "error",
}

export type SseEventMap = Record<string, unknown>;
