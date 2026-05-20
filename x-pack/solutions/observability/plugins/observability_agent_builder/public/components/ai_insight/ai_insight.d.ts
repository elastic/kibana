import React from 'react';
import type { Observable } from 'rxjs';
import { type InsightStreamEvent } from '../../hooks/use_streaming_ai_insight';
import { type InsightType } from '../../analytics';
export interface AiInsightResponse {
    summary: string;
    context: string;
}
export interface AiInsightAttachment {
    type: string;
    data: Record<string, unknown>;
    hidden?: boolean;
}
export interface AiInsightProps {
    title: string;
    insightType: InsightType;
    createStream: (signal: AbortSignal) => Observable<InsightStreamEvent>;
    buildAttachments: (summary: string, context: string) => AiInsightAttachment[];
}
export declare function AiInsight({ title, insightType, createStream, buildAttachments }: AiInsightProps): React.JSX.Element | null;
