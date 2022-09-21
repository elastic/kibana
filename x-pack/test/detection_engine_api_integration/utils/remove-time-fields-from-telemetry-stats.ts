import { unset } from 'lodash';

export const removeTimeFieldsFromTelemetryStats = (stats: any) => {
  Object.entries(stats).forEach(([, value]: [unknown, any]) => {
    value.forEach((entry: any, i: number) => {
      entry.forEach((e: any, j: number) => {
        unset(value, `[${i}][${j}].time_executed_in_ms`);
        unset(value, `[${i}][${j}].start_time`);
        unset(value, `[${i}][${j}].end_time`);
      })
    })
  })
}
