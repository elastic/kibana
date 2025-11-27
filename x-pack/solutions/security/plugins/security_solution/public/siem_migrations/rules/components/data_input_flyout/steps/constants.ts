/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MigrationSource } from '../../../../common/types';

export enum SplunkDataInputStep {
  Rules = 1,
  Macros = 2,
  Lookups = 3,
  End = 10,
}

export enum QradarDataInputStep {
  Rules = 1,
  End = 10,
}

export interface DataInputStep {
  [MigrationSource.SPLUNK]: SplunkDataInputStep;
  [MigrationSource.QRADAR]: QradarDataInputStep;
}

export enum DataInputStepId {
  SplunkRules = 'splunk_rules',
  SplunkMacros = 'splunk_macros',
  SplunkLookups = 'splunk_lookups',
  QradarRules = 'qradar_rules',
}
