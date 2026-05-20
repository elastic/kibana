import type { UseFormReset } from 'react-hook-form';
import type { Annotation } from '../../../../common/annotations';
import type { CreateAnnotationForm } from '../components/create_annotation';
export declare const useEditAnnotationHelper: ({ reset, editAnnotation, setIsCreateOpen, }: {
    reset: UseFormReset<CreateAnnotationForm>;
    editAnnotation?: Annotation | null;
    setIsCreateOpen: (val: boolean) => void;
}) => void;
