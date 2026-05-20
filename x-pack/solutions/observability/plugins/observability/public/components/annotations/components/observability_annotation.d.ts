import type { TooltipSpec } from '@elastic/charts';
import React from 'react';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { Annotation } from '../../../../common/annotations';
export interface ObservabilityAnnotationsProps {
    slo?: SLOWithSummaryResponse;
    tooltipSpecs?: Partial<TooltipSpec>;
    annotations?: Annotation[];
    isCreateOpen: boolean;
    setIsCreateOpen: (value: boolean) => void;
}
export declare function ObservabilityAnnotations({ slo, tooltipSpecs, annotations, isCreateOpen, setIsCreateOpen, }: ObservabilityAnnotationsProps): React.JSX.Element;
export default ObservabilityAnnotations;
