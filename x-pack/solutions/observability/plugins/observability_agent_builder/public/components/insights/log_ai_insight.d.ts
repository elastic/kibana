import React from 'react';
export interface LogAiInsightDocument {
    fields: {
        field: string;
        value: unknown[];
    }[];
}
export interface LogAiInsightProps {
    doc: LogAiInsightDocument | undefined;
}
export declare function LogAiInsight({ doc }: LogAiInsightProps): React.JSX.Element | null;
