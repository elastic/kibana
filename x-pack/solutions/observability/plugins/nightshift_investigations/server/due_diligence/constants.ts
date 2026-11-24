/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DUE_DILIGENCE_CYCLE_HOOK_ID = 'nightshift.due_diligence';

/** The check runs before every n-th agent cycle, off the recorder's own cadence of 4. */
export const DUE_DILIGENCE_EVERY_CYCLES = 6;
/**
 * The agent waits for the check, so it is bounded. A check that cannot answer in time adds
 * nothing and the agent carries on. The hook's own timeout leaves a margin for the model call's abort.
 */
export const DUE_DILIGENCE_TIMEOUT_MS = 45_000;
/** Only hypotheses held at least this strongly are reviewed back to the agent. */
export const DUE_DILIGENCE_MIN_CONFIDENCE = 0.6;
/** Hypotheses reviewed in one note, strongest first, so the note stays short. */
export const DUE_DILIGENCE_MAX_HYPOTHESES = 3;
export const DUE_DILIGENCE_THOUGHTS_MAX_CHARS = 700;
export const DUE_DILIGENCE_CANDIDATE_MAX_CHARS = 120;
