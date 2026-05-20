import type { FindSLOResponse } from '@kbn/slo-schema';
import React from 'react';
import type { ViewType } from '../../types';
export interface Props {
    sloList: FindSLOResponse | undefined;
    loading: boolean;
    error: boolean;
    view: ViewType;
}
export declare function UngroupedView({ sloList, loading, error, view }: Props): React.JSX.Element;
