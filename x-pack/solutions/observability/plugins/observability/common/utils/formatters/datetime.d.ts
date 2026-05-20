import moment from 'moment-timezone';
export type TimeUnit = 'hours' | 'minutes' | 'seconds' | 'milliseconds';
type DateUnit = 'days' | 'months' | 'years';
export declare const getDateDifference: ({ start, end, unitOfTime, precise, }: {
    start: moment.Moment;
    end: moment.Moment;
    unitOfTime: DateUnit | TimeUnit;
    precise?: boolean;
}) => number;
export declare function asAbsoluteDateTime(time: number, timeUnit?: TimeUnit): string;
/**
 *
 * Returns the dates formatted according to the difference between the two dates:
 *
 * | Difference     |           Format                               |
 * | -------------- |:----------------------------------------------:|
 * | >= 5 years     | YYYY - YYYY                                    |
 * | >= 5 months    | MMM YYYY - MMM YYYY                            |
 * | > 1 day        | MMM D, YYYY - MMM D, YYYY                      |
 * | >= 1 minute    | MMM D, YYYY, HH:mm - HH:mm (UTC)               |
 * | >= 10 seconds  | MMM D, YYYY, HH:mm:ss - HH:mm:ss (UTC)         |
 * | default        | MMM D, YYYY, HH:mm:ss.SSS - HH:mm:ss.SSS (UTC) |
 *
 * @param start timestamp
 * @param end timestamp
 */
export declare function asRelativeDateTimeRange(start: number, end: number): string;
export {};
