import React from 'react';
export interface ChartTimeRange {
    lastUpdated: number;
    to?: number;
    from?: number;
}
export declare function LastUpdated(): React.JSX.Element | null;
