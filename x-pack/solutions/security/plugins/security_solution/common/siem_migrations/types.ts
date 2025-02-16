/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SiemMigrationStatus } from './constants';

export interface RuleMigrationFilters {
  status?: SiemMigrationStatus | SiemMigrationStatus[];
  ids?: string[];
  installed?: boolean;
  installable?: boolean;
  prebuilt?: boolean;
  failed?: boolean;
  fullyTranslated?: boolean;
  partiallyTranslated?: boolean;
  untranslatable?: boolean;
  searchTerm?: string;
}

/**
 *
 * Based on the severity levels defined in the Splunk Common Information Model (CIM) documentation
 *
 * https://docs.splunk.com/Documentation/CIM/6.0.2/User/Alerts
 *
 **/
export interface SplunkSeverity {
  '1': 'INFO';
  '2': 'LOW';
  '3': 'MEDIUM';
  '4': 'HIGH';
  '5': 'CRITICAL';
}
