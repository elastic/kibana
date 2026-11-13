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
  /**
   * Overrides the default empty-body copy when the example has neither answer
   * nor question nor steps (e.g. "evaluated without a conversational agent").
   */
  emptyNote?: string;
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
  /** Header shown over the row-label column; blank when omitted. */
  rowLabelHeader?: string;
  /** Collapsible caption; when set the table renders inside an open `<details>`. */
  caption?: string;
  columns: ReportSummaryColumn[];
  /** `columns.length` cells per row; the first column is the row label. */
  rows: Array<{
    label: string;
    subtitle?: string;
    cells: ReportSummaryCell[];
  }>;
}

/** A provenance fragment: plain text, or a link when a safe http(s) `href` is given. */
export type ReportProvenanceItem = string | { text: string; href?: string };

export interface ReportDocument {
  title: string;
  /** Provenance fragments (branch, build link, generated-at, ...). */
  provenance?: ReportProvenanceItem[];
  /** Methodology / scoring-semantics notes, rendered as a collapsible block. */
  notes?: string[];
  summaryTable?: ReportSummaryTable;
  /** Extra tables rendered after `summaryTable` (e.g. token cost). */
  summaryTables?: ReportSummaryTable[];
  /** Static helper line rendered after the summary table(s). */
  legend?: string;
  sections: ReportSection[];
}

/** A named output format for `renderReport`. */
export interface ReportAdapter {
  /** Registry key, e.g. `'html'` or `'json'`. */
  name: string;
  render: (doc: ReportDocument) => string;
}
