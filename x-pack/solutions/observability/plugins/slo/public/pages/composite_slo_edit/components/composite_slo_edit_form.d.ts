import React from 'react';
import type { CreateCompositeSLOForm } from '../types';
interface Props {
    initialValues?: CreateCompositeSLOForm;
    compositeSloId?: string;
    isEditMode?: boolean;
}
export declare function CompositeSloEditForm({ initialValues, compositeSloId, isEditMode }: Props): React.JSX.Element;
export {};
