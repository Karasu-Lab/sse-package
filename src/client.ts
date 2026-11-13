import { SseControlEvent, type SseEventMap } from "./events";

export type SseHandlers<E extends SseEventMap> = {
    [K in keyof E & string]?: (data: E[K]) => void;
};

export interface SseClientOptions<E extends SseEventMap> {
    on: SseHandlers<E>;
    onDone?: () => void;
    onError?: () => void;
    withCredentials?: boolean;
}

export class SseClient<E extends SseEventMap> {
    private readonly source: EventSource;

    constructor(url: string | URL, options: SseClientOptions<E>) {
        this.source = new EventSource(url.toString(), {
            withCredentials: options.withCredentials,
        });

        for (const [event, handler] of Object.entries(options.on)) {
            this.source.addEventListener(event, (message) => {
                (handler as ((data: unknown) => void) | undefined)?.(
                    JSON.parse((message as MessageEvent).data as string),
                );
            });
        }
        this.source.addEventListener(SseControlEvent.Done, () => {
            this.close();
            options.onDone?.();
        });
        this.source.addEventListener(SseControlEvent.Error, () => {
            this.close();
            options.onError?.();
        });
    }

    close(): void {
        this.source.close();
    }
}
