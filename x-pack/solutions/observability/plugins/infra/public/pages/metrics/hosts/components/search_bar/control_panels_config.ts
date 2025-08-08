/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CLOUD_PROVIDER,
  HOST_OS_NAME,
  OS_NAME,
  SERVICE_NAME,
  type DataSchemaFormat,
} from '@kbn/metrics-data-access-plugin/common';
import type { ControlPanels } from '@kbn/observability-shared-plugin/public';

export const getControlPanelConfigs = (schema: DataSchemaFormat | null = 'ecs'): ControlPanels => ({
  [schema === 'semconv' ? OS_NAME : HOST_OS_NAME]: {
    order: 0,
    width: 'medium',
    grow: false,
    type: 'optionsListControl',
    fieldName: schema === 'semconv' ? OS_NAME : HOST_OS_NAME,
    title: 'Operating System',
  },
  [CLOUD_PROVIDER]: {
    order: 1,
    width: 'medium',
    grow: false,
    type: 'optionsListControl',
    fieldName: CLOUD_PROVIDER,
    title: 'Cloud Provider',
  },
  [SERVICE_NAME]: {
    order: 2,
    width: 'medium',
    grow: false,
    type: 'optionsListControl',
    fieldName: SERVICE_NAME,
    title: 'Service Name',
  },
});
