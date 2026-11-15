/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { useProfilingDependencies } from '../components/contexts/profiling_dependencies/use_profiling_dependencies';

/** Resolves the time range Profiling falls back to when the URL carries none. */
export const useDefaultTimeRange = (): { from: string; to: string } => {
  const {
    start: { core, data },
  } = useProfilingDependencies();

  const timePickerTimeDefaults = core.uiSettings.get<{ from: string; to: string }>(
    UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS
  );

  const { from, to } = data.query.timefilter.timefilter.getTime();

  return {
    from: from ?? timePickerTimeDefaults.from,
    to: to ?? timePickerTimeDefaults.to,
  };
};
