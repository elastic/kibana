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

/**
 * Generic, solution-agnostic report model for per-example evaluation reports.
 *
 * The document is a plain data tree: suites build a `ReportDocument` from their
 * own run artifacts and hand it to a pluggable output adapter (HTML, JSON, ...)
 * via `renderReport`. Adapters never receive anything but this model, so a
 * solution can add its own adapter without touching the framework.
 */

/** One reasoning/tool step inside an example's agent trace. */
export interface ReportStep {
  kind: 'tool' | 'skill' | 'think';
  toolId?: string;
  toolParams?: string;
  text?: string;
  skills?: Array<string | { id?: string; name?: string }>;
}

/** A single evaluated example: prompt, answer, trace and per-example scores. */
export interface ReportExample {
  id: string;
  /** Human label; defaults to `id` when omitted. */
  label?: string;
  status: 'completed' | 'failed' | 'missing' | (string & {});
  /** Optional per-example score, already formatted by the caller. */
  score?: string;
  /** Short `a · b · c` meta fragments rendered next to the header. */
  meta?: string[];
  question?: string;
  /** Answer as markdown; rendered through the adapter's markdown pipeline. */
  answerMarkdown?: string;
  toolTrail?: string[];
  steps?: ReportStep[];
}

export interface ReportSection {
  id: string;
  title: string;
  /** Monospaced secondary identifier (e.g. model id) shown under the title. */
  subtitle?: string;
  /** `completed/total` style completion badge; renderers display it verbatim. */
  completion?: string;
  examples: ReportExample[];
}

export interface ReportSummaryColumn {
  id: string;
  label: string;
  /** Optional column-group heading spanning consecutive columns. */
  group?: string;
}

export interface ReportSummaryCell {
  /** Pre-formatted cell text (score, badge, dash, ...). */
  text: string;
  tone?: 'ok' | 'err' | 'warn';
  /** Hover tooltip. */
  title?: string;
}

export interface ReportSummaryTable {
  columns: ReportSummaryColumn[];
  /** `columns.length` cells per row; the first column is the row label. */
  rows: Array<{
    label: string;
    subtitle?: string;
    cells: ReportSummaryCell[];
  }>;
}

export interface ReportDocument {
  title: string;
  /** Provenance fragments (branch, build link, generated-at, ...). */
  provenance?: string[];
  /** Methodology / scoring-semantics notes, rendered as a collapsible block. */
  notes?: string[];
  summaryTable?: ReportSummaryTable;
  sections: ReportSection[];
}

/** A named output format for `renderReport`. */
export interface ReportAdapter {
  /** Registry key, e.g. `'html'` or `'json'`. */
  name: string;
  render: (doc: ReportDocument) => string;
}
