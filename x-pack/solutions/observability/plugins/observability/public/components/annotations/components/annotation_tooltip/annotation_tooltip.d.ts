import React from 'react';
import type { Annotation, CreateAnnotationParams } from '../../../../../common/annotations';
export interface AnnotationTooltipProps {
    annotation: Annotation | CreateAnnotationParams;
}
declare function AnnotationTooltip({ annotation }: AnnotationTooltipProps): React.JSX.Element;
export default AnnotationTooltip;
