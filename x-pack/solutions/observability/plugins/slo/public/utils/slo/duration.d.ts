import type moment from 'moment';
import type { BrushEvent } from '@elastic/charts';
import type { Duration } from '../../typings';
import type { TimeBounds } from '../../pages/slo_details/types';
export declare function toDuration(duration: string): Duration;
export declare function toMinutes(duration: Duration): number;
export declare function toCalendarAlignedMomentUnitOfTime(unit: string): moment.unitOfTime.StartOf;
export declare function getBrushTimeBounds(e: BrushEvent): TimeBounds;
