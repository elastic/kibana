/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus, TerminalExecutionStatuses } from '@kbn/workflows';

/**
 * Execution-status classification shared by the Family D workflow gates.
 *
 * Gate D4 polls for a paused execution, rejects the approval, and then asserts
 * the run is halted. It used the string `waiting_for_input` for the pre-reject
 * pause but excluded only that spelling after rejection, so an engine that
 * reports the equivalent `waiting` state would have been read as "halted" while
 * the execution was in fact still parked — the gate could pass with zero marker
 * documents for the wrong reason.
 *
 * Both spellings now come from the platform enum and are classified in one
 * place, so a pause state can never be mistaken for a terminal one. The
 * terminal list is the platform's own (`TerminalExecutionStatuses`), not a
 * local copy that can drift.
 */

/** States in which an execution is parked awaiting external input. */
export const PAUSE_STATUSES: readonly string[] = [
  ExecutionStatus.WAITING,
  ExecutionStatus.WAITING_FOR_INPUT,
];

export const isPauseStatus = (status: string | undefined): boolean =>
  status !== undefined && PAUSE_STATUSES.includes(status);

export const isTerminalStatus = (status: string | undefined): boolean =>
  status !== undefined && (TerminalExecutionStatuses as readonly string[]).includes(status);

/**
 * True only when the execution has reached a terminal state. A paused or
 * still-running execution is NOT halted, whichever spelling the engine uses.
 */
export const isHalted = (status: string | undefined): boolean => isTerminalStatus(status);
