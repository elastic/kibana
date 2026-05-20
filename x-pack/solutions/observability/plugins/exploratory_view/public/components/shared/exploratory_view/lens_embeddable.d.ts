import type { Dispatch, SetStateAction } from 'react';
import React from 'react';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { ChartTimeRange } from './header/last_updated';
interface Props {
    lensAttributes: TypedLensByValueInput['attributes'];
    setChartTimeRangeContext: Dispatch<SetStateAction<ChartTimeRange | undefined>>;
}
export declare function LensEmbeddable(props: Props): React.JSX.Element | null;
export {};
