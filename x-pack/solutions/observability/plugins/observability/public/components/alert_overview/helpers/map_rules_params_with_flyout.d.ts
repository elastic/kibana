import type { TopAlert } from '../../../typings/alerts';
export interface FlyoutThresholdData {
    observedValue: string;
    threshold: string[];
    comparator: string;
    pctAboveThreshold: string;
    warningThreshold?: string;
    warningComparator?: string;
}
export declare const mapRuleParamsWithFlyout: (alert: TopAlert) => FlyoutThresholdData[] | undefined;
