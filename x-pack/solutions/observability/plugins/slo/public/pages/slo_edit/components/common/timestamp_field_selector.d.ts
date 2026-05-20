import type { FieldSpec } from '@kbn/data-views-plugin/common';
import React from 'react';
interface Props {
    fields: FieldSpec[];
    isDisabled: boolean;
    isLoading: boolean;
}
export declare function TimestampFieldSelector({ fields, isDisabled, isLoading }: Props): React.JSX.Element;
export {};
