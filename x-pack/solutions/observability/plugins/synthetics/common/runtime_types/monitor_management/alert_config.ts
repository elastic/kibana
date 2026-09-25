/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaOutput } from '../schema_output';
import { AlertConfigCodec, AlertConfigsCodec } from '../zod/alert_config';

export { AlertConfigCodec, AlertConfigsCodec };

export type AlertConfig = SchemaOutput<typeof AlertConfigCodec>;
export type AlertConfigs = SchemaOutput<typeof AlertConfigsCodec>;

export const toggleStatusAlert = (configs: AlertConfigs = {}): AlertConfigs => {
  if (configs.status?.enabled) {
    return {
      ...configs,
      status: {
        ...configs.status,
        enabled: false,
      },
    };
  }
  return {
    ...configs,
    status: {
      enabled: true,
    },
  };
};

export const isStatusEnabled = (configs: AlertConfigs = {}): boolean => {
  return configs.status?.enabled ?? false;
};
