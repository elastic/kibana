import React from 'react';
import type { Annotation, CreateAnnotationParams } from '../../../../common/annotations';
export interface AnnotationIconProps {
    annotation: Annotation | CreateAnnotationParams;
}
declare function AnnotationIcon({ annotation }: AnnotationIconProps): React.JSX.Element;
export default AnnotationIcon;
