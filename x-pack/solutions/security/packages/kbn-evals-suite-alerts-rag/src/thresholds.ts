/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Evaluator thresholds for the Alerts RAG regression suite.
 *
 * Baseline derivation
 * -------------------
 * Dataset: "Alerts RAG Regression (Episodes 1-8)"
 *   LangSmith ID: bd5bba1d-97aa-4512-bce7-b09aa943c651
 *   Examples: 6 | Experiments: 1,684
 *
 * Well-functioning models (GPT-4.1, GPT-5, GPT-OSS-120B) consistently score
 * 4/6 = 0.667 on LangSmith binary correctness.  Two examples fail structurally:
 *   - "what hosts are affected?" — LangSmith ES source returns host UUIDs, not
 *     human-readable names.  The @kbn/evals context contains explicit `host.name`
 *     values (SRVMAC08 etc.), so this failure mode does not apply here.
 *   - "which user.name is mentioned most?" — similar UUID-vs-field issue; resolved
 *     by the same explicit context in this suite.
 *
 * 10th-percentile derivation
 * --------------------------
 * Per-example binary scores from LangSmith: {4 × 1.0, 2 × 0.0} per experiment.
 * Mapping to continuous LLM-as-judge scale and adjusting for the improved context
 * in @kbn/evals (both previously-failing examples now answerable):
 *
 *   - CORRECTNESS_PASSING  = 0.4   (≈P10 of per-example continuous scores;
 *                                   allows one moderate failure before regression fires)
 *   - FAITHFULNESS_PASSING = 0.5   (faithfulness for grounded context questions
 *                                   is empirically higher; P10 set conservatively)
 *
 * Scores below the PASSING floor signal a regression.
 * Scores above PASSING but below PARTIAL are labelled "partial".
 * Scores at or above PARTIAL are labelled "correct" / "faithful".
 */
export const ALERTS_RAG_THRESHOLDS = {
  /**
   * Correctness regression floor (≈ LangSmith P10).
   * Scores below this threshold are labelled 'incorrect' and signal a regression.
   */
  CORRECTNESS_PASSING: 0.4,

  /**
   * Correctness partial-credit boundary.
   * Scores ≥ PASSING but < PARTIAL are labelled 'partial'.
   * Scores ≥ PARTIAL are labelled 'correct'.
   */
  CORRECTNESS_PARTIAL: 0.7,

  /**
   * Faithfulness regression floor (≈ LangSmith P10, adjusted for grounded context).
   * Scores below this threshold are labelled 'unfaithful' and signal a regression.
   */
  FAITHFULNESS_PASSING: 0.5,

  /**
   * Faithfulness partial-credit boundary.
   * Scores ≥ PASSING but < PARTIAL are labelled 'partial'.
   * Scores ≥ PARTIAL are labelled 'faithful'.
   */
  FAITHFULNESS_PARTIAL: 0.7,
} as const;
