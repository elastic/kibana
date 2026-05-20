import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { FieldPath } from 'react-hook-form';
import type { CreateSLOForm } from '../../types';
import type { SearchBarProps } from './query_builder';
interface Props {
    searchBarProps: SearchBarProps;
    dataView: DataView;
    name: FieldPath<CreateSLOForm>;
}
export declare function DocumentsTable({ dataView, name, searchBarProps }: Props): React.JSX.Element;
export {};
