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
/**
 * The final pass blocks the end of the execution, so it is bounded. It may read workspace files
 * over a few model calls before it answers, so it gets longer than a live pass.
 */
export const FINDINGS_RECORDER_FINAL_TIMEOUT_MS = 120_000;
/** A live pass is abandoned after this long, so a hung model call cannot pin the guard. */
export const FINDINGS_RECORDER_LIVE_TIMEOUT_MS = 90_000;

/** The agent's tool results are clipped before they are replayed to the recorder. */
export const TOOL_RESULT_MAX_CHARS = 1_500;
/** The human message that started the investigation. */
export const QUESTION_MAX_CHARS = 4_000;
/** The agent's own final answer, which the final pass treats as the verdict source. */
export const ANSWER_MAX_CHARS = 20_000;

/** Where the final pass can read. Nothing outside it is reachable. */
export const RECORDER_WORKSPACE_ROOT = '/workspace';
/** Full text of the tool results that the recorder is shown clipped, written at the final pass. */
export const RECORDER_RESULTS_DIR = '/workspace/.recorder/results';
/** Model calls the final pass may spend reading files before it must answer. */
export const RECORDER_MAX_TOOL_ROUNDS = 5;
/** Reads and lists the final pass may make in total, so a loop cannot read the whole workspace. */
export const RECORDER_MAX_TOOL_CALLS = 12;
export const RECORDER_READ_DEFAULT_BYTES = 16_000;
export const RECORDER_READ_MAX_BYTES = 32_000;
export const RECORDER_LIST_MAX_ENTRIES = 200;
