import React from 'react';
import type { AnnotationsPermissions } from '../../hooks/use_annotation_permissions';
import type { Annotation } from '../../../../../common/annotations';
export declare function DeleteAnnotations({ selection, isLoading, permissions, setIsDeleteModalVisible, }: {
    selection: Annotation[];
    isLoading?: boolean;
    permissions?: AnnotationsPermissions;
    setIsDeleteModalVisible: (isVisible: boolean) => void;
}): React.JSX.Element;
