import React from 'react';
export declare const TimeRangeContext: React.Context<{
    timeRangeId: string;
    refresh: () => void;
} | undefined>;
export declare function TimeRangeContextProvider({ children }: {
    children: React.ReactElement;
}): React.JSX.Element;
