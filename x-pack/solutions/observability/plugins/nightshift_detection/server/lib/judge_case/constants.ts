/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Every bound of the judge's case, in one place until a settings store exists. The numbers are
 * starting points, not measured values.
 */
export const JUDGE_CASE_SETTINGS = {
  /** Distinct evidence queries one run starts; a query past it is skipped, so one run cannot flood Elasticsearch. */
  max_evidence_queries_per_run: 40,
  /** Characters of the serialized case; over it, evidence is trimmed in a fixed order. */
  max_chars: 60_000,
  /** Candidate events kept in a join case; the rest are counted in `omitted`. */
  max_candidates: 3,
  /** Members of one event whose evidence is read, so a large event does not fill the case. */
  members_per_event: 2,
  /** Reasons kept per candidate. */
  max_reasons: 5,
  /** Breached alerts kept in a case. */
  max_alerts: 10,
  /** Notes from past deactivations kept in a case. */
  max_notes: 10,
  /** Longest free-text string the caller gave (notes, titles, summaries, reasons), in UTF-16 code units. */
  text_max_length: 1_000,
  /** Longest cell, in UTF-16 code units, once the last trimming step runs. */
  trimmed_cell_length: 200,
} as const;
