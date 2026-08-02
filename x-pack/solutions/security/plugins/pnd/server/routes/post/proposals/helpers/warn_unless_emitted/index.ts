/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

/**
 * What an emit helper reports back. Both `emitIncidentClosed` and `emitDetectionChangeSignal` return
 * a narrower version of this; the shared shape is what lets one reporter cover both signals without
 * either helper knowing the other exists.
 */
export type EmitOutcome = { emitted: true } | { emitted: false; reason: string };

export interface WarnUnlessEmittedParams {
  logger: Logger;
  /** Settled, not awaited: the two emits are independent, so neither can suppress the other. */
  result: PromiseSettledResult<EmitOutcome>;
  /** The proposal the analyst acted on, so the two facts are correlatable in the log. */
  sourceId: string;
  /** Trigger that did not fire, named so a reader does not have to guess which signal is missing. */
  triggerId: string;
}

/**
 * Record a resume whose signal did not fire (finding R4).
 *
 * The resume genuinely succeeded, so the route still answers `{ resumed: true }` — downgrading it
 * would lie about what happened. But the two facts are separable, and a swallowed emit used to leave
 * no trace of the second one, so both are said distinctly against the source id.
 *
 * A `rejected` result should be unreachable: both emit helpers catch everything and resolve. It is
 * still handled, because the alternative to reporting a helper that regressed to throwing is an
 * unhandled rejection inside the route's `try`, which would turn a signalling problem into a `500`
 * on an already-applied resume.
 */
export const warnUnlessEmitted = ({
  logger,
  result,
  sourceId,
  triggerId,
}: WarnUnlessEmittedParams): void => {
  if (result.status === 'rejected') {
    logger.warn(
      `Resumed PND proposal "${sourceId}", but "${triggerId}" was not emitted (emit_threw: ${
        result.reason instanceof Error ? result.reason.message : String(result.reason)
      })`
    );
    return;
  }

  if (!result.value.emitted) {
    logger.warn(
      `Resumed PND proposal "${sourceId}", but "${triggerId}" was not emitted (${result.value.reason})`
    );
  }
};
