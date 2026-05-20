import type { GetSLOResponse } from '@kbn/slo-schema';
import React from 'react';
interface Props {
    slo?: GetSLOResponse;
    disabled: boolean;
}
export declare function SLOInspect({ slo, disabled }: Props): React.JSX.Element;
export {};
