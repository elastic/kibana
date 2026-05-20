import React from 'react';
export interface Thresholds {
    good: string;
    bad: string;
}
interface Props {
    title: string;
    value?: string | null;
    ranks?: number[];
    loading: boolean;
    thresholds: Thresholds;
    isCls?: boolean;
    helpLabel: string;
    dataTestSubj?: string;
}
export declare function getCoreVitalTooltipMessage(thresholds: Thresholds, position: number, title: string, percentage: number, isCls?: boolean): string;
export declare function CoreVitalItem({ loading, title, value, thresholds, ranks, isCls, helpLabel, dataTestSubj, }: Props): React.JSX.Element;
export {};
