/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterControlConfig } from '@kbn/alerts-ui-shared';
import { DEFAULT_CONTROLS } from '@kbn/alerts-ui-shared/src/alert_filter_controls/constants';
import { ALERT_STATUS } from '@kbn/rule-data-utils';
import { ALERT_STATUS_ALL } from '../../../common/constants';
import { AlertStatus } from '../../../common/typings';

export function setStatusOnControlConfigs(
  status: AlertStatus,
  controlConfigs?: FilterControlConfig[]
) {
  const updateControlConfigs = controlConfigs ? [...controlConfigs] : DEFAULT_CONTROLS;
  const statusControl = updateControlConfigs.find((control) => control.fieldName === ALERT_STATUS);
  if (statusControl) {
    if (status === ALERT_STATUS_ALL) {
      statusControl.selectedOptions = [];
    } else {
      statusControl.selectedOptions = [status];
    }
  }

  return updateControlConfigs;
}
