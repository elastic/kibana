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

import { htmlReportAdapter } from './adapters/html';
import { jsonReportAdapter } from './adapters/json';
import type { ReportAdapter, ReportDocument } from './types';

export type {
  ReportAdapter,
  ReportDocument,
  ReportExample,
  ReportSection,
  ReportStep,
  ReportSummaryCell,
  ReportSummaryColumn,
  ReportSummaryTable,
} from './types';

const adapters = new Map<string, ReportAdapter>([
  [htmlReportAdapter.name, htmlReportAdapter],
  [jsonReportAdapter.name, jsonReportAdapter],
]);

/**
 * Register a custom output adapter. Re-registering an existing name replaces
 * it, except for `json`, which stays reserved as the guaranteed fallback.
 */
export const registerReportAdapter = (adapter: ReportAdapter): void => {
  if (adapter.name === 'json') {
    throw new Error("Cannot replace the reserved 'json' fallback adapter");
  }
  adapters.set(adapter.name, adapter);
};

export const listReportAdapters = (): string[] => [...adapters.keys()];

export interface RenderReportResult {
  /** Adapter name that actually produced `output`. */
  adapter: string;
  output: string;
  /** True when the requested adapter was unavailable or failed and JSON was used instead. */
  fellBackTo: 'none' | 'json';
  /** Populated when `fellBackTo` is `'json'` because the adapter threw. */
  error?: string;
}

/**
 * Render a report document with a named adapter. Unknown adapter names and
 * adapter failures fall back to the reserved JSON adapter rather than
 * throwing, so report generation can never lose a run's data.
 */
export const renderReport = (doc: ReportDocument, adapterName = 'html'): RenderReportResult => {
  const adapter = adapters.get(adapterName);
  if (!adapter) {
    return {
      adapter: jsonReportAdapter.name,
      output: jsonReportAdapter.render(doc),
      fellBackTo: 'json',
      error: `Unknown report adapter '${adapterName}'`,
    };
  }
  try {
    return { adapter: adapter.name, output: adapter.render(doc), fellBackTo: 'none' };
  } catch (err) {
    return {
      adapter: jsonReportAdapter.name,
      output: jsonReportAdapter.render(doc),
      fellBackTo: 'json',
      error: err instanceof Error ? err.message : String(err),
    };
  }
};
