import type { ReactNode } from 'react';
import React from 'react';
import type { FieldPath } from 'react-hook-form';
import type { CreateSLOForm } from '../../../types';
export interface Props {
    dataTestSubj: string;
    fieldName: string;
    label: string;
    name: FieldPath<CreateSLOForm>;
    placeholder: string;
    tooltip?: ReactNode;
}
export declare function FieldSelector({ dataTestSubj, fieldName, label, name, placeholder, tooltip, }: Props): React.JSX.Element;
