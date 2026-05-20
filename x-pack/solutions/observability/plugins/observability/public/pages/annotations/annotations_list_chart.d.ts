import React from 'react';
import type { AnnotationsPermissions } from '../../components/annotations/hooks/use_annotation_permissions';
import type { Annotation } from '../../../common/annotations';
export declare function AnnotationsListChart({ data, start, end, isEditing, setIsEditing, permissions, }: {
    data: Annotation[];
    start: string;
    end: string;
    isEditing: Annotation | null;
    permissions?: AnnotationsPermissions;
    setIsEditing: (annotation: Annotation | null) => void;
}): React.JSX.Element;
