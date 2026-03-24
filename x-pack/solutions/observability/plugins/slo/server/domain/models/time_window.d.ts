import type { calendarAlignedTimeWindowSchema, rollingTimeWindowSchema, timeWindowSchema } from '@kbn/slo-schema';
import type moment from 'moment';
import type * as t from 'io-ts';
type TimeWindow = t.TypeOf<typeof timeWindowSchema>;
type RollingTimeWindow = t.TypeOf<typeof rollingTimeWindowSchema>;
type CalendarAlignedTimeWindow = t.TypeOf<typeof calendarAlignedTimeWindowSchema>;
export type { RollingTimeWindow, TimeWindow, CalendarAlignedTimeWindow };
export declare function toCalendarAlignedTimeWindowMomentUnit(timeWindow: CalendarAlignedTimeWindow): moment.unitOfTime.StartOf;
export declare function toRollingTimeWindowMomentUnit(timeWindow: RollingTimeWindow): moment.unitOfTime.Diff;
