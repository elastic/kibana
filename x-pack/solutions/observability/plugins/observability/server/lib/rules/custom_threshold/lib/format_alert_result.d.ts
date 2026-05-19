import type { Evaluation } from './evaluate_rule';
export type FormattedEvaluation = Omit<Evaluation, 'currentValue' | 'threshold'> & {
    currentValue: string;
    threshold: string[];
};
export declare const getLabel: (criterion: Evaluation) => string;
export declare const formatAlertResult: (evaluationResult: Evaluation) => FormattedEvaluation;
