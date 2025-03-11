/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const AlertConfigCodec = t.intersection([
  t.interface({
    enabled: t.boolean,
  }),
  t.partial({
    groupBy: t.string,
  }),
]);

export const AlertConfigsCodec = t.partial({
  tls: AlertConfigCodec,
  status: AlertConfigCodec,
});

export type AlertConfig = t.TypeOf<typeof AlertConfigCodec>;
export type AlertConfigs = t.TypeOf<typeof AlertConfigsCodec>;

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
