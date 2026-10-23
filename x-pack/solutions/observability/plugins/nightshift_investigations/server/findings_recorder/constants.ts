/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const FINDINGS_RECORDER_CYCLE_HOOK_ID = 'nightshift.findings_recorder';
export const FINDINGS_RECORDER_AFTER_EXECUTION_HOOK_ID = 'nightshift-findings-recorder';

/** A live pass starts every n-th agent cycle. */
export const FINDINGS_RECORDER_EVERY_CYCLES = 4;
/** The final pass blocks the end of the execution, so it is bounded. */
export const FINDINGS_RECORDER_FINAL_TIMEOUT_MS = 60_000;
/** A live pass is abandoned after this long, so a hung model call cannot pin the guard. */
export const FINDINGS_RECORDER_LIVE_TIMEOUT_MS = 90_000;

/** The agent's tool results are clipped before they are replayed to the recorder. */
export const TOOL_RESULT_MAX_CHARS = 1_500;
/** The human message that started the investigation. */
export const QUESTION_MAX_CHARS = 4_000;
/** The agent's own final answer, which the final pass treats as the verdict source. */
export const ANSWER_MAX_CHARS = 20_000;
