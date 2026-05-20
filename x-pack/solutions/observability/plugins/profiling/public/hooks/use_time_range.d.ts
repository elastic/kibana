import type { TimeRange } from '../../common/types';
interface TimeRangeAPI {
    timeRangeId: string;
}
interface TimeRangeInSeconds {
    inSeconds: {
        start: number;
        end: number;
    };
}
interface PartialTimeRangeInSeconds {
    inSeconds: Pick<Partial<TimeRangeInSeconds['inSeconds']>, 'start' | 'end'>;
}
type PartialTimeRange = Pick<Partial<TimeRange>, 'start' | 'end'>;
export declare function useTimeRange(range: {
    rangeFrom?: string;
    rangeTo?: string;
    optional: true;
}): TimeRangeAPI & PartialTimeRange & PartialTimeRangeInSeconds;
export declare function useTimeRange(range: {
    rangeFrom: string;
    rangeTo: string;
}): TimeRangeAPI & TimeRange & TimeRangeInSeconds;
export {};
