import React from 'react';
import type { Annotation } from '../../../../../common/annotations';
export declare function DeleteAnnotationsModal({ isDeleteModalVisible, onDelete, setSelection, setIsDeleteModalVisible, selection, }: {
    selection: Annotation[];
    isDeleteModalVisible: boolean;
    setSelection: (selection: Annotation[]) => void;
    onDelete: () => void;
    setIsDeleteModalVisible: (isVisible: boolean) => void;
}): React.JSX.Element;
