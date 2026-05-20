import React from 'react';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { Annotation, CreateAnnotationParams } from '../../../../common/annotations';
export declare function NewLineAnnotation({ slo, isCreateOpen, }: {
    slo?: SLOWithSummaryResponse;
    isCreateOpen: boolean;
}): React.JSX.Element | null;
export declare function ObsLineAnnotation({ annotation, }: {
    annotation: CreateAnnotationParams | Annotation;
}): React.JSX.Element;
