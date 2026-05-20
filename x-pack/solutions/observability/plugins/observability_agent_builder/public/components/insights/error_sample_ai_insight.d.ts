import React from 'react';
export interface ErrorSampleAiInsightProps {
    errorId: string;
    serviceName: string;
    start: string;
    end: string;
    environment: string;
}
export declare function ErrorSampleAiInsight({ errorId, serviceName, start, end, environment, }: ErrorSampleAiInsightProps): React.JSX.Element;
