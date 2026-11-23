/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { getPackageReportStepDefinition } from '../../../step_types/package_report';
import { createWorkerServerContextMock } from '../../../workers/worker_server_context.mock';
import { continuousThreatHuntServerDefinition } from './worker_server';

jest.mock('../../../step_types/package_report', () => {
  const actual = jest.requireActual('../../../step_types/package_report');
  return {
    ...actual,
    getPackageReportStepDefinition: jest.fn(actual.getPackageReportStepDefinition),
  };
});

describe('continuousThreatHuntServerDefinition', () => {
  it('builds its packaging step without resolving any service before start', () => {
    const context = createWorkerServerContextMock();

    const steps = continuousThreatHuntServerDefinition.getStepDefinitions?.(context) ?? [];

    expect(steps.map((step) => ('id' in step ? step.id : undefined))).toEqual([
      'hunt.packageReport',
    ]);
    expect(context.getProposalsPlugin).not.toHaveBeenCalled();
    expect(context.getActionsService).not.toHaveBeenCalled();
  });

  it('hands the packaging step the context services it reads at run time', async () => {
    const esClient = {};
    const conversations = {};
    const context = createWorkerServerContextMock({
      getInternalEsClient: jest.fn(() => esClient as never),
      getConversations: jest.fn(() => conversations as never),
      isContextEngineEnabled: jest.fn(async () => true),
    });
    continuousThreatHuntServerDefinition.getStepDefinitions?.(context);
    const [deps] = jest.mocked(getPackageReportStepDefinition).mock.lastCall ?? [];
    if (!deps) throw new Error('getPackageReportStepDefinition was not called');
    const request = httpServerMock.createKibanaRequest();

    expect(deps.getInternalEsClient?.()).toBe(esClient);
    expect(deps.getConversations()).toBe(conversations);
    await expect(deps.isContextEngineEnabled(request)).resolves.toBe(true);
    expect(context.isContextEngineEnabled).toHaveBeenCalledWith(request);
    expect(deps.logger).toBe(context.logger);

    deps.getResolveHostEnrollment?.('default', esClient as never);
    expect(context.getFleetAgentService).toHaveBeenCalled();
  });

  it('keeps Hunt services unavailable until AlertZero has finished starting', () => {
    const context = createWorkerServerContextMock();
    continuousThreatHuntServerDefinition.getStepDefinitions?.(context);
    const [deps] = jest.mocked(getPackageReportStepDefinition).mock.lastCall ?? [];
    if (!deps) throw new Error('getPackageReportStepDefinition was not called');

    expect(() => deps.getHuntServices()).toThrow('not started');

    jest.mocked(context.assertStarted).mockImplementation(() => undefined);
    expect(deps.getHuntServices()).toEqual(
      expect.objectContaining({ getInference: expect.any(Function) })
    );
  });
});
