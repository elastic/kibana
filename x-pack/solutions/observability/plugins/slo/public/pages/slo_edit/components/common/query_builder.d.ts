import type { DataView } from '@kbn/data-views-plugin/common';
import type { ReactNode } from 'react';
import React from 'react';
import type { FieldPath } from 'react-hook-form';
import type { CreateSLOForm } from '../../types';
export interface SearchBarProps {
    dataTestSubj: string;
    dataView?: DataView;
    label: string;
    name: FieldPath<CreateSLOForm>;
    placeholder: string;
    required?: boolean;
    tooltip?: ReactNode;
}
export declare function QueryBuilder(props: SearchBarProps): React.JSX.Element;
