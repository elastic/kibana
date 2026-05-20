import type { DataView } from '@kbn/data-views-plugin/public';
import React from 'react';
interface Props {
    dataView?: DataView;
    isLoading: boolean;
}
export declare function IndexAndTimestampField({ dataView, isLoading }: Props): React.JSX.Element;
export {};
