import React from 'react';
import type { OperationType } from '@kbn/lens-plugin/public';
import type { SeriesUrl } from '../../types';
export declare function OperationTypeSelect({ seriesId, series, defaultOperationType, }: {
    seriesId: number;
    series: SeriesUrl;
    defaultOperationType?: OperationType;
}): React.JSX.Element;
export declare function OperationTypeComponent({ operationType, onChange, }: {
    operationType?: OperationType;
    onChange: (value: OperationType) => void;
}): React.JSX.Element;
