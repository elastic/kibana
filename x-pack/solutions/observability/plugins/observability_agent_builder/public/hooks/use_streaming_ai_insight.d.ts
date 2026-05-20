import type { Observable } from 'rxjs';
import type { ConnectorInfo } from '../../common';
export type { ConnectorInfo };
interface ContextEvent {
    type: 'context';
    context: string;
}
interface ConnectorInfoEvent {
    type: 'connectorInfo';
    connector: ConnectorInfo;
}
interface ChatCompletionChunkEvent {
    type: 'chatCompletionChunk';
    content: string;
}
interface ChatCompletionMessageEvent {
    type: 'chatCompletionMessage';
    content: string;
}
export type InsightStreamEvent = ContextEvent | ConnectorInfoEvent | ChatCompletionChunkEvent | ChatCompletionMessageEvent;
export interface InsightResponse {
    summary: string;
    context: string;
    connectorInfo?: ConnectorInfo;
}
export declare function useStreamingAiInsight(createStream: (signal: AbortSignal) => Observable<InsightStreamEvent>): {
    isLoading: boolean;
    error: string | undefined;
    isErrorRetryable: boolean;
    summary: string;
    context: string;
    connectorInfo: ConnectorInfo | undefined;
    wasStopped: boolean;
    fetch: () => void;
    stop: () => void;
    regenerate: () => void;
};
