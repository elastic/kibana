import type { SLODefinitionResponse } from '@kbn/slo-schema';
import React from 'react';
import type { WindowSchema } from '../../typings';
interface AlertTimeTableProps {
    slo: SLODefinitionResponse;
    windows: WindowSchema[];
}
export declare function AlertTimeTable({ windows, slo }: AlertTimeTableProps): React.JSX.Element;
export {};
