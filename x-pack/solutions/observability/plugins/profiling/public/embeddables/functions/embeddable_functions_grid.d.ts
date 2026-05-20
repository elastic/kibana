import type { TopNFunctions } from '@kbn/profiling-utils';
import React from 'react';
interface Props {
    data?: TopNFunctions;
    totalSeconds: number;
    showFullScreenSelector?: boolean;
}
export declare function EmbeddableFunctionsGrid({ data, totalSeconds, showFullScreenSelector }: Props): React.JSX.Element;
export {};
