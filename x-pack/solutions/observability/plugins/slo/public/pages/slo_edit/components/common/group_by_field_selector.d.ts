import type { FieldSpec } from '@kbn/data-views-plugin/common';
import React from 'react';
interface Props {
    indexFields: FieldSpec[];
    isDisabled: boolean;
    isLoading: boolean;
}
export declare function GroupByFieldSelector({ indexFields, isDisabled, isLoading }: Props): React.JSX.Element;
export {};
