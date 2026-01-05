/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  QRADAR_COPYRIGHT_NOTICE,
  SPLUNK_COPYRIGHT_NOTICE,
} from '../translations/data_input_flyouts';
import { MigrationSource } from '../types';

export const VENDOR_COPYRIGHT_NOTICES: Record<MigrationSource, string> = {
  [MigrationSource.SPLUNK]: SPLUNK_COPYRIGHT_NOTICE,
  [MigrationSource.QRADAR]: QRADAR_COPYRIGHT_NOTICE,
};

export const getCopyrightNoticeByVendor = (vendor: MigrationSource): string => {
  return VENDOR_COPYRIGHT_NOTICES[vendor];
};
