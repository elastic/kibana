import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
export interface TimeRange {
    from: Date;
    to: Date;
}
export interface AlertAnnotation {
    date: Date;
    total: number;
}
interface Props {
    slo: SLOWithSummaryResponse;
    threshold?: number;
    dataTimeRange: TimeRange;
    alertTimeRange?: TimeRange;
    annotations?: AlertAnnotation[];
    variant: 'success' | 'danger';
}
export declare function useLensDefinition({ slo, threshold, dataTimeRange, alertTimeRange, annotations, variant, }: Props): TypedLensByValueInput['attributes'];
export {};
