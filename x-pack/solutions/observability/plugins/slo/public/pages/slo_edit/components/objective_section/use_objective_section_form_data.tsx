/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGeneratedHtmlId } from '@elastic/eui';
import type { TimeWindowType } from '@kbn/slo-schema';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { CALENDARALIGNED_TIMEWINDOW_OPTIONS, ROLLING_TIMEWINDOW_OPTIONS } from '../../constants';
import type { CreateSLOForm } from '../../types';
import { usePluginContext } from '../../../../hooks/use_plugin_context';

export function useObjectiveSectionFormData() {
  const {
    watch,
    setValue,
    formState: { defaultValues },
  } = useFormContext<CreateSLOForm>();
  const { isServerless } = usePluginContext();

  const budgetingSelect = useGeneratedHtmlId({ prefix: 'budgetingSelect' });
  const timeWindowTypeSelect = useGeneratedHtmlId({ prefix: 'timeWindowTypeSelect' });
  const timeWindowSelect = useGeneratedHtmlId({ prefix: 'timeWindowSelect' });
  const timeWindowType = watch('timeWindow.type');
  const indicator = watch('indicator.type');
  const budgetingMethod = watch('budgetingMethod');

  const [timeWindowTypeState, setTimeWindowTypeState] = useState<TimeWindowType | undefined>(
    defaultValues?.timeWindow?.type
  );

  /**
   * Two flow to handle: Create and Edit
   * On create: the default value is set to rolling & 30d (useForm)
   * When we change the window type (from rolling to calendar for example), we want to select a default duration (picking item 1 in the options)
   * If we don't, the select will show the option as selected, but the value is still the one from the previous window type, until the user manually changes the value
   *
   * On edit: the default value is set with the slo value
   * When we change the window type, we want to change the selected value as we do in the create flow, but we also want to fallback on the initial default value
   *
   */
  useEffect(() => {
    if (timeWindowType === 'calendarAligned' && timeWindowTypeState !== timeWindowType) {
      setTimeWindowTypeState(timeWindowType);
      const exists = CALENDARALIGNED_TIMEWINDOW_OPTIONS.map((opt) => opt.value).includes(
        defaultValues?.timeWindow?.duration ?? ''
      );
      setValue(
        'timeWindow.duration',
        (exists
          ? defaultValues?.timeWindow?.duration
          : CALENDARALIGNED_TIMEWINDOW_OPTIONS[1].value) as string
      );
    } else if (timeWindowType === 'rolling' && timeWindowTypeState !== timeWindowType) {
      const exists = ROLLING_TIMEWINDOW_OPTIONS.map((opt) => opt.value).includes(
        defaultValues?.timeWindow?.duration ?? ''
      );
      setTimeWindowTypeState(timeWindowType);
      setValue(
        'timeWindow.duration',
        (exists
          ? defaultValues?.timeWindow?.duration
          : ROLLING_TIMEWINDOW_OPTIONS[1].value) as string
      );
    }
  }, [timeWindowType, setValue, defaultValues, timeWindowTypeState]);

  return {
    isServerless,
    budgetingSelect,
    timeWindowTypeSelect,
    timeWindowSelect,
    timeWindowType,
    indicator,
    budgetingMethod,
  };
}
