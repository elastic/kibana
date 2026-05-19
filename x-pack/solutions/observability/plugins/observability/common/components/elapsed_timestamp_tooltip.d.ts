import React from 'react';
import moment from 'moment';
import type { TimeUnit } from '../utils/formatters/datetime';
interface Props {
    /**
     * timestamp in milliseconds
     */
    time: number;
    timeUnit?: TimeUnit;
}
export declare function getElapsedTimeText(duration: moment.Duration): string;
export declare function ElapsedTimestampTooltip({ time }: Props): React.JSX.Element;
export {};
