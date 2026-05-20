import type { Observable } from 'rxjs';
import type { ChatCompletionEvent, InferenceConnector } from '@kbn/inference-common';
import type { ConnectorInfo } from '../../../common';
export type { ConnectorInfo };
export interface ContextEvent {
    type: 'context';
    context: string;
    [key: string]: unknown;
}
export interface ConnectorInfoEvent {
    type: 'connectorInfo';
    connector: ConnectorInfo;
    [key: string]: unknown;
}
export type AiInsightEvent = ChatCompletionEvent | ContextEvent | ConnectorInfoEvent;
export interface AiInsightResult {
    events$: Observable<AiInsightEvent>;
    context: string;
}
/**
 * Builds ConnectorInfo from an InferenceConnector
 */
export declare function buildConnectorInfo(connector: InferenceConnector): ConnectorInfo;
/**
 * Creates an AiInsightResult by prepending context and connector info events to the chat completion stream.
 */
export declare function createAiInsightResult(context: string, connector: InferenceConnector, events$: Observable<ChatCompletionEvent>): AiInsightResult;
