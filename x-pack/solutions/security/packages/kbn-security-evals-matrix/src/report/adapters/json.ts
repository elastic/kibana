/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements under the Elastic License 2.0; you may
 * not use this file except in compliance with the Elastic License 2.0.
 */

import type { ReportAdapter, ReportDocument } from '../types';

/**
 * JSON output adapter — the always-available fallback. Serialises the document
 * verbatim so any downstream tool can post-process it, and it keeps working
 * when no richer adapter applies.
 */
export const renderReportJson = (doc: ReportDocument): string =>
  `${JSON.stringify(doc, null, 2)}\n`;

export const jsonReportAdapter: ReportAdapter = {
  name: 'json',
  render: renderReportJson,
};
