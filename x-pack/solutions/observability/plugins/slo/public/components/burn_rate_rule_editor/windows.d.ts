import React from 'react';
import type { CreateSLOInput, SLODefinitionResponse } from '@kbn/slo-schema';
import type { Duration, WindowSchema } from '../../typings';
import type { WindowResult } from './validation';
export declare const calculateMaxBurnRateThreshold: (longWindow: Duration, slo?: SLODefinitionResponse | CreateSLOInput) => number;
export declare const createNewWindow: (slo?: SLODefinitionResponse | CreateSLOInput, partialWindow?: Partial<WindowSchema>) => WindowSchema;
interface WindowsProps {
    windows: WindowSchema[];
    onChange: (windows: WindowSchema[]) => void;
    slo?: SLODefinitionResponse;
    errors: WindowResult[];
    totalNumberOfWindows?: number;
}
export declare function Windows({ slo, windows, errors, onChange, totalNumberOfWindows }: WindowsProps): React.JSX.Element;
export {};
