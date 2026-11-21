/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { NATIVE_VULN_SCANNER_SCAN_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { StepDeps } from './deps';

export const RUN_ID = 'exec-1';

export const buildContext = (
  input: unknown,
  signal: AbortSignal = new AbortController().signal,
  startedAt: string | Date = '2026-11-13T00:00:00.000Z',
  workflowId: string = NATIVE_VULN_SCANNER_SCAN_WORKFLOW_ID
): StepHandlerContext<unknown, unknown> =>
  ({
    input,
    abortSignal: signal,
    contextManager: {
      getContext: () => ({ execution: { id: RUN_ID, startedAt }, workflow: { id: workflowId } }),
    },
  } as unknown as StepHandlerContext<unknown, unknown>);

export const buildDeps = (overrides: Partial<StepDeps> = {}) => {
  const es = {};
  const packRepository = {};
  const deps: StepDeps = {
    logger: loggingSystemMock.createLogger(),
    getScanDeps: jest.fn(async () => ({ es, packRepository } as never)),
    getLicense: jest.fn(async () =>
      licenseMock.createLicense({ license: { type: 'enterprise', mode: 'enterprise' } })
    ),
    includeUnfixed: false,
    now: () => new Date('2026-11-13T01:00:00.000Z'),
    ...overrides,
  };
  return { deps, es, packRepository };
};
