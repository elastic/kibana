/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import qs from 'query-string';
import { useHistory, useLocation } from 'react-router-dom';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { useProfilingDependencies } from '../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { getParsedDate } from '../utils/get_next_time_range';

export function useDateRangeRedirect() {
  const history = useHistory();
  const location = useLocation();
  const query = qs.parse(location.search);
  const rangeFrom = query.rangeFrom;
  const rangeTo = query.rangeTo;
  const validatedRangeFrom = getParsedDate(rangeFrom?.toString());
  const validatedRangeTo = getParsedDate(rangeTo?.toString());

  const {
    start: { core, data },
  } = useProfilingDependencies();

  const timePickerTimeDefaults = core.uiSettings.get<{ from: string; to: string }>(
    UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS
  );

  const timePickerSharedState = data.query.timefilter.timefilter.getTime();

  const isDateRangeSet = rangeFrom && rangeTo;

  const isInvalidDateRange =
    validatedRangeFrom &&
    validatedRangeTo &&
    validatedRangeFrom.getTime() > validatedRangeTo.getTime();

  const redirect = () => {
    const nextQuery = {
      ...query,
      rangeFrom: timePickerSharedState.from ?? timePickerTimeDefaults.from,
      rangeTo: timePickerSharedState.to ?? timePickerTimeDefaults.to,
    };

    history.replace({
      ...location,
      search: qs.stringify(nextQuery),
    });
  };

  return {
    isDateRangeSet: isDateRangeSet && !isInvalidDateRange,
    redirect,
    // does not add date range for this page
    skipDataRangeSet: history.location.pathname === '/add-data-instructions',
  };
}
