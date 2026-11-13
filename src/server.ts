import { SseControlEvent, type SseEventMap } from "./events";

export interface SseServerStreamOptions {
    onClose?: () => void;
}

export class SseServerStream<E extends SseEventMap> {
    private readonly encoder = new TextEncoder();
    private controller: ReadableStreamDefaultController<Uint8Array> | null =
        null;
    private closed = false;

    private constructor(private readonly options: SseServerStreamOptions) {}

    static respond<E extends SseEventMap>(
        produce: (stream: SseServerStream<E>) => Promise<void>,
        options: SseServerStreamOptions = {},
    ): Response {
        const stream = new SseServerStream<E>(options);
        const body = new ReadableStream<Uint8Array>({
            start: async (controller) => {
                stream.controller = controller;
                try {
                    await produce(stream);
                    stream.write(SseControlEvent.Done, {});
                } catch {
                    stream.write(SseControlEvent.Error, {});
                } finally {
                    stream.close();
                }
            },
            cancel: () => stream.close(),
        });
        return new Response(body, {
            headers: {
                "content-type": "text/event-stream",
                "cache-control": "no-store",
                "x-accel-buffering": "no",
            },
        });
    }

    send<K extends keyof E & string>(event: K, data: E[K]): void {
        this.write(event, data);
    }

    private write(event: string, data: unknown): void {
        if (this.closed) return;
        this.controller?.enqueue(
            this.encoder.encode(
                `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
            ),
        );
    }

    private close(): void {
        if (this.closed) return;
        this.closed = true;
        try {
            this.controller?.close();
        } catch {}
        this.options.onClose?.();
    }
}
