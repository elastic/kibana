/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Writable } from '@kbn/utility-types';
import type { FilterControlConfig } from '@kbn/alerts-ui-shared';
import { DEFAULT_CONTROLS } from '@kbn/alerts-ui-shared/src/alert_filter_controls/constants';
import { ALERT_STATUS } from '@kbn/rule-data-utils';
import { ALERT_STATUS_ALL } from '../../../common/constants';
import type { AlertStatus } from '../../../common/typings';

export function setStatusOnControlConfigs(
  status: AlertStatus,
  controlConfigs?: Writable<FilterControlConfig>[]
) {
  const updateControlConfigs = controlConfigs
    ? [...controlConfigs]
    : (DEFAULT_CONTROLS as Writable<FilterControlConfig>[]);
  const statusControl = updateControlConfigs.find((control) => control.field_name === ALERT_STATUS);
  if (statusControl) {
    if (status === ALERT_STATUS_ALL) {
      statusControl.selected_options = [];
    } else {
      statusControl.selected_options = [status];
    }
  }

  return updateControlConfigs;
}
