import React from 'react';
import type { TimeUnit } from '../../../../common/utils/formatters/datetime';
interface Props {
    /**
     * timestamp in milliseconds
     */
    time: number;
    timeUnit?: TimeUnit;
}
export declare function TimestampTooltip({ time, timeUnit }: Props): React.JSX.Element;
export {};
