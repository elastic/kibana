import React from 'react';
import type { Moment } from 'moment';
import type { Annotation, CreateAnnotationParams } from '../../../../common/annotations';
export type CreateAnnotationForm = Omit<CreateAnnotationParams, '@timestamp' | 'event'> & {
    '@timestamp': Moment;
    event: {
        start?: Moment | null;
        end?: Moment | null;
    };
};
export interface CreateAnnotationProps {
    isLoading: boolean;
    onSave: () => void;
    onCancel: () => void;
    isCreateAnnotationsOpen: boolean;
    editAnnotation?: Annotation | null;
    updateAnnotation: (data: {
        annotation: Annotation;
    }) => void;
    createAnnotation: (data: {
        annotation: CreateAnnotationParams;
    }) => void;
    deleteAnnotation: (data: {
        annotations: Annotation[];
    }) => void;
}
declare function CreateAnnotation({ onSave, onCancel, isLoading, editAnnotation, createAnnotation, deleteAnnotation, updateAnnotation, isCreateAnnotationsOpen, }: CreateAnnotationProps): React.JSX.Element;
export default CreateAnnotation;
