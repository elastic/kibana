import React from 'react';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { Annotation, CreateAnnotationParams } from '../../../../common/annotations';
export declare function NewRectAnnotation({ slo, isCreateOpen, }: {
    isCreateOpen: boolean;
    slo?: SLOWithSummaryResponse;
}): React.JSX.Element | null;
export declare function ObsRectAnnotation({ annotation, }: {
    annotation: Annotation | CreateAnnotationParams;
}): React.JSX.Element;
