/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OPTIONS_LIST_CONTROL } from '@kbn/controls-constants';
import {
  CLOUD_PROVIDER,
  HOST_OS_NAME,
  OS_TYPE,
  SERVICE_NAME,
  type DataSchemaFormat,
} from '@kbn/metrics-data-access-plugin/common';
import type { ControlPanels } from '@kbn/observability-shared-plugin/public';

type ReplaceableControl = Record<
  string,
  { key: string; control: ControlPanels[keyof ControlPanels] }
>;
const commonControlPanelConfig: ControlPanels = {
  [CLOUD_PROVIDER]: {
    order: 1,
    width: 'medium',
    grow: false,
    type: OPTIONS_LIST_CONTROL,
    fieldName: CLOUD_PROVIDER,
    title: 'Cloud Provider',
  },
  [SERVICE_NAME]: {
    order: 2,
    width: 'medium',
    grow: false,
    type: OPTIONS_LIST_CONTROL,
    fieldName: SERVICE_NAME,
    title: 'Service Name',
  },
};

const controlPanelConfig: Record<DataSchemaFormat, ControlPanels> = {
  ecs: {
    [HOST_OS_NAME]: {
      order: 0,
      width: 'medium',
      grow: false,
      type: OPTIONS_LIST_CONTROL,
      fieldName: HOST_OS_NAME,
      title: 'Operating System',
    },
  },
  semconv: {
    [OS_TYPE]: {
      order: 0,
      width: 'medium',
      grow: false,
      type: OPTIONS_LIST_CONTROL,
      fieldName: OS_TYPE,
      title: 'Operating System',
    },
  },
};

const replaceableControlPanels: Record<DataSchemaFormat, ReplaceableControl> = {
  ecs: {
    [OS_TYPE]: {
      key: HOST_OS_NAME,
      control: controlPanelConfig.ecs[HOST_OS_NAME],
    },
  },
  semconv: {
    [HOST_OS_NAME]: {
      key: OS_TYPE,
      control: controlPanelConfig.semconv[OS_TYPE],
    },
  },
};

export const getControlPanelConfigs = (
  schema?: DataSchemaFormat | null
): { controls: ControlPanels; replace?: ReplaceableControl } => {
  if (!schema) {
    return {
      controls: { ...controlPanelConfig.ecs, ...commonControlPanelConfig },
    };
  }

  return {
    controls: { ...controlPanelConfig[schema], ...commonControlPanelConfig },
    replace: replaceableControlPanels[schema],
  };
};
