/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Severity } from '@kbn/nightshift-investigations-plugin/common';

/** Shared by the severity tiles, the section headings, and each list row. */
export const SEVERITY_DOT_COLOR: Record<Severity, 'danger' | 'warning' | 'primary' | 'success'> = {
  '80-critical': 'danger',
  '60-high': 'warning',
  '40-medium': 'primary',
  '20-low': 'success',
};
