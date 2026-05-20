import { COMPARATORS } from '@kbn/alerting-comparators';
import type { Evaluation } from './lib/evaluate_rule';
export declare const buildFiredAlertReason: (alertResults: Array<Record<string, Evaluation>>, group: string, dataView: string) => string;
export declare const buildRecoveredAlertReason: (alertResult: {
    group: string;
    label?: string;
    comparator: COMPARATORS;
    threshold: Array<number | string>;
    currentValue: number | string;
}) => string;
export declare const buildNoDataAlertReason: (alertResult: Evaluation & {
    group: string;
}) => string;
export declare const buildErrorAlertReason: (metric: string) => string;
