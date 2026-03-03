/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterGroupHandler } from '@kbn/alerts-ui-shared';
import type { OptionsListControlApi } from '@kbn/controls-plugin/public/controls/data_controls/options_list_control/types';
import { ALERT_STATUS_ALL } from '../../../common/constants';
import type { AlertStatus } from '../../../common/typings';

export function updateSelectedOptions(
  status: AlertStatus,
  controlIndex: number,
  alertFilterControlHandler?: FilterGroupHandler
) {
  if (!alertFilterControlHandler || controlIndex < 0) {
    return;
  }
  if (status === ALERT_STATUS_ALL) {
    const controlApi = alertFilterControlHandler?.children$.getValue()[
      controlIndex
    ] as OptionsListControlApi;
    controlApi?.clearSelections?.();
  } else {
    const controlApi = alertFilterControlHandler?.children$.getValue()[
      controlIndex
    ] as Partial<OptionsListControlApi>;
    if (controlApi && controlApi.setSelectedOptions) {
      controlApi.setSelectedOptions([status]);
    }
  }
}
