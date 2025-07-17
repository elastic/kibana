/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SUCCESS_REPORT_NODE,
  UNVALIDATED_REPORT_NODE,
} from '@kbn/elastic-assistant-plugin/server/lib/langchain/tracers/esql_telemetry_tracer/esql_telemetry_tracer';
import {
  BUILD_SUCCESS_REPORT_FROM_LAST_MESSAGE_NODE,
  BUILD_UNVALIDATED_REPORT_FROM_LAST_MESSAGE_NODE,
} from './constants';

describe('esql_telemetry_tracer', () => {
  it('nodes checked by telemetry tracer exist', () => {
    expect(SUCCESS_REPORT_NODE).toEqual(BUILD_SUCCESS_REPORT_FROM_LAST_MESSAGE_NODE);
    expect(UNVALIDATED_REPORT_NODE).toEqual(BUILD_UNVALIDATED_REPORT_FROM_LAST_MESSAGE_NODE);
  });
});
