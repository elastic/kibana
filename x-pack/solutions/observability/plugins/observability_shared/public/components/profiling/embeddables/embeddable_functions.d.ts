import React from 'react';
import type { TopNFunctions } from '@kbn/profiling-utils';
interface Props {
    data?: TopNFunctions;
    isLoading: boolean;
    rangeFrom: number;
    rangeTo: number;
    height?: string;
    showFullScreenSelector?: boolean;
}
export declare function EmbeddableFunctions(props: Props): React.JSX.Element;
export {};
