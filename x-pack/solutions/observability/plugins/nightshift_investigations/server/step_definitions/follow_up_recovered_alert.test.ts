/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { GetInvestigationsClient } from '../routes/types';
import { followUpRecoveredAlertStepDefinition } from './follow_up_recovered_alert';

jest.mock('@kbn/workflows-extensions/server', () => ({
  createServerStepDefinition: jest.fn((definition) => definition),
}));

const request = {} as KibanaRequest;
const createContext = (input: Record<string, unknown>) =>
  ({
    input,
    contextManager: {
      getFakeRequest: jest.fn().mockReturnValue(request),
      getContext: jest.fn().mockReturnValue({ workflow: { id: 'wf-1', spaceId: 'test-space' } }),
    },
  } as never);

const createDefinition = (followUpRecoveredAlert: jest.Mock) => {
  const getInvestigationsClient = jest
    .fn()
    .mockReturnValue({ followUpRecoveredAlert }) as unknown as GetInvestigationsClient;
  return {
    definition: followUpRecoveredAlertStepDefinition(getInvestigationsClient),
    getInvestigationsClient,
  };
};

const INPUT = {
  alert_uuid: 'alert-1',
  alert_id: 'service.name:checkout',
  alert_start: null,
  recovered_at: '2026-08-24T12:15:30.000Z',
  rule_id: 'rule-1',
  rule_name: 'Latency is too high',
  rule_type_id: 'apm.transaction_duration',
  rule_tags: ['prod'],
};

describe('followUpRecoveredAlertStepDefinition', () => {
  it("follows up in the workflow's space and returns the investigation and its round", async () => {
    const followUpRecoveredAlert = jest
      .fn()
      .mockResolvedValue({ investigation_id: 'inv-1', execution_id: 'exec-rec-1' });
    const { definition, getInvestigationsClient } = createDefinition(followUpRecoveredAlert);

    await expect(definition.handler(createContext(INPUT))).resolves.toEqual({
      output: { investigation_id: 'inv-1', execution_id: 'exec-rec-1' },
    });

    expect(getInvestigationsClient).toHaveBeenCalledWith(request, 'test-space');
    expect(followUpRecoveredAlert).toHaveBeenCalledWith({
      alertUuid: 'alert-1',
      alertId: 'service.name:checkout',
      alertStart: null,
      recoveredAt: '2026-08-24T12:15:30.000Z',
      ruleId: 'rule-1',
      ruleName: 'Latency is too high',
      ruleTypeId: 'apm.transaction_duration',
      ruleTags: ['prod'],
    });
  });

  it('reports a skip when no open investigation holds the alert', async () => {
    const { definition } = createDefinition(jest.fn().mockResolvedValue(undefined));

    await expect(definition.handler(createContext(INPUT))).resolves.toEqual({
      output: { skip_reason: 'no_open_investigation' },
    });
  });

  it('fails the step when the follow-up fails, so the run records the error', async () => {
    const { definition } = createDefinition(
      jest.fn().mockRejectedValue(new Error('Investigations are not available'))
    );

    await expect(definition.handler(createContext(INPUT))).rejects.toThrow(
      'Investigations are not available'
    );
  });

  it('accepts an alert without a start time or tags', async () => {
    const followUpRecoveredAlert = jest.fn().mockResolvedValue(undefined);
    const { definition } = createDefinition(followUpRecoveredAlert);
    const { rule_tags: _ruleTags, ...withoutTags } = INPUT;

    await definition.handler(createContext({ ...withoutTags, alert_start: null }));

    expect(followUpRecoveredAlert).toHaveBeenCalledWith(
      expect.objectContaining({ alertStart: null, ruleTags: undefined })
    );
  });

  it('rejects an input without an alert UUID', async () => {
    const followUpRecoveredAlert = jest.fn();
    const { definition } = createDefinition(followUpRecoveredAlert);

    await expect(definition.handler(createContext({ ...INPUT, alert_uuid: '' }))).rejects.toThrow();
    expect(followUpRecoveredAlert).not.toHaveBeenCalled();
  });
});
