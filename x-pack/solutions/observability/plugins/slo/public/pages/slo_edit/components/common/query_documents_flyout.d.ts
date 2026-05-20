import type { DataView } from '@kbn/data-views-plugin/common';
import React from 'react';
import type { FieldPath } from 'react-hook-form';
import type { CreateSLOForm } from '../../types';
import type { SearchBarProps } from './query_builder';
interface Props {
    dataView: DataView;
    searchBarProps: SearchBarProps;
    onCloseFlyout: () => void;
    name: FieldPath<CreateSLOForm>;
}
export declare function QueryDocumentsFlyout({ name, dataView, searchBarProps, onCloseFlyout }: Props): React.JSX.Element;
export {};
