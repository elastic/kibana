/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';

export const xpackOption = {
  upgrade_assistant: {
    enabled: false,
  },
  security: {
    enabled: false,
  },
  ccr: {
    enabled: false,
  },
  monitoring: {
    enabled: false,
  },
  beats: {
    enabled: false,
  },
  ilm: {
    enabled: false,
  },
  logstash: {
    enabled: false,
  },
  rollup: {
    enabled: false,
  },
  watcher: {
    enabled: false,
  },
  remote_clusters: {
    enabled: false,
  },
  reporting: {
    enabled: false,
  },
  task_manager: {
    enabled: false,
  },
  maps: {
    enabled: false,
  },
  oss_telemetry: {
    enabled: false,
  },
  xpack_main: {
    enabled: true,
  },
};
export const pluginPaths = resolve(__dirname, '../../../');
