import React from 'react';
import type { FieldPath } from 'react-hook-form';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { CreateSLOForm } from '../../types';
export declare function RunTimeFieldUsed({ dataView, name, }: {
    dataView?: DataView;
    name: FieldPath<CreateSLOForm>;
}): React.JSX.Element | null;
