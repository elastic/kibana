/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The CSV parsing is part of the reusable confidence core.
export { parseAnonymizedAlertsCsv, splitMultiValue } from '@kbn/discoveries/impl/confidence';
export type { ParsedAlertFields } from '@kbn/discoveries/impl/confidence';
