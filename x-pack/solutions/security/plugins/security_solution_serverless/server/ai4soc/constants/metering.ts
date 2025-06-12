/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const METERING_TASK = {
  TITLE: 'Serverless AI for SOC Usage Metering Task',
  TYPE: 'serverless-security:ai4soc-usage-reporting-task',
  VERSION: '1.0.0',
  INTERVAL: '20m',
  SAMPLE_PERIOD_SECONDS: 3600, // 1 hour
  USAGE_TYPE: 'security_solution_ai4soc',
  MAX_BACKFILL_RECORDS: 504, // 1 week
};
