import React from 'react';
export interface AiInsightErrorBannerProps {
    error: string;
    onRetry?: () => void;
}
export declare function AiInsightErrorBanner({ error, onRetry }: AiInsightErrorBannerProps): React.JSX.Element;
