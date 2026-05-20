import type { Moment } from 'moment';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { CreateAnnotationForm } from './components/create_annotation';
export declare function getDefaultAnnotation({ slo, timestamp, eventEnd, }: {
    timestamp?: Moment;
    eventEnd?: Moment;
    slo?: SLOWithSummaryResponse;
}): CreateAnnotationForm;
