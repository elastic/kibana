/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaOutput } from '../schema_output';
import {
  ProjectMonitorThrottlingConfigCodec,
  ProjectMonitorCodec,
  ProjectMonitorsRequestCodec,
  LegacyProjectMonitorsRequestCodec,
  ProjectMonitorMetaDataCodec,
  ProjectMonitorsResponseCodec,
} from '../zod/monitor_types_project';

export {
  ProjectMonitorThrottlingConfigCodec,
  ProjectMonitorCodec,
  ProjectMonitorsRequestCodec,
  LegacyProjectMonitorsRequestCodec,
  ProjectMonitorMetaDataCodec,
  ProjectMonitorsResponseCodec,
};

// io-ts typed `schedule` as `string | number`. The zod codec only accepts
// `number | '10s' | '30s'`, so the public alias keeps the wider static type.
export type ProjectMonitor = Omit<SchemaOutput<typeof ProjectMonitorCodec>, 'schedule'> & {
  schedule: string | number;
};
export type LegacyProjectMonitorsRequest = SchemaOutput<typeof LegacyProjectMonitorsRequestCodec>;
export type ProjectMonitorsRequest = SchemaOutput<typeof ProjectMonitorsRequestCodec>;
export type ProjectMonitorMetaData = SchemaOutput<typeof ProjectMonitorMetaDataCodec>;
