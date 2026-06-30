/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { TelemetryReporter, EntityMaintainerRunSummaryEvent } from '../../telemetry/events';
import { ENTITY_MAINTAINER_RUN_SUMMARY_EVENT } from '../../telemetry/events';

/**
 * The maintainer-facing portion of a run-summary event. Maintainers fill in the
 * data-plane fields; the framework injects identity and timing on flush.
 */
export type MaintainerRunReport = Omit<
  EntityMaintainerRunSummaryEvent,
  'id' | 'namespace' | 'runId' | 'durationMs' | 'aborted' | 'errorClass' | 'errorMessage'
>;

/**
 * Exposed to maintainers via `EntityMaintainerTaskMethodContext.telemetry`.
 * Calling `report()` buffers a summary; the framework flushes it after the run.
 */
export interface MaintainerTelemetryClient {
  report(payload: MaintainerRunReport): void;
}

export interface MaintainerTelemetryFlushContext {
  durationMs: number;
  aborted: boolean;
  errorClass?: string;
  errorMessage?: string;
}

/**
 * Extended interface held by the framework. Not exposed to maintainers.
 */
export interface InternalMaintainerTelemetryClient extends MaintainerTelemetryClient {
  flush(ctx: MaintainerTelemetryFlushContext): void;
}

export const createMaintainerTelemetryClient = ({
  id,
  namespace,
  analytics,
}: {
  id: string;
  namespace: string;
  analytics: TelemetryReporter;
}): InternalMaintainerTelemetryClient => {
  const runId = uuidv4();
  const buffer: MaintainerRunReport[] = [];

  return {
    report(payload) {
      buffer.push(payload);
    },

    flush({ durationMs, aborted, errorClass, errorMessage }) {
      if (buffer.length === 0) return;
      for (const report of buffer) {
        analytics.reportEvent(ENTITY_MAINTAINER_RUN_SUMMARY_EVENT, {
          id,
          namespace,
          runId,
          durationMs,
          aborted,
          errorClass,
          errorMessage: errorMessage?.substring(0, 500),
          ...report,
        });
      }
    },
  };
};
