/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IdentityProposal } from '../types';
import { ELASTICSEARCH_CONNECTOR_TYPE_ID, elasticAlertsAdapter, wasActiveAt } from './elastic';
import type { AdapterContext } from './types';

const POST = '2026-11-24T10:00:00.000Z';

const alertDoc = (overrides: Record<string, unknown> = {}) => ({
  _source: {
    'kibana.alert.uuid': 'alert-1',
    'kibana.alert.instance.id': 'host-a',
    'kibana.alert.rule.uuid': 'rule-1',
    'kibana.alert.rule.name': 'High error rate',
    'kibana.alert.rule.rule_type_id': '.es-query',
    'kibana.alert.status': 'active',
    'kibana.alert.start': '2026-11-24T09:58:00.000Z',
    '@timestamp': '2026-11-24T10:25:00.000Z',
    ...overrides,
  },
});

const proposal = (overrides: Partial<IdentityProposal> = {}): IdentityProposal => ({
  source: 'elastic',
  connector_id: 'remote-es',
  alert_id: 'alert-1',
  rule_id: null,
  instance_key: null,
  evidence: [],
  ...overrides,
});

const createContext = ({
  hits = [alertDoc()],
  connector = {
    actionTypeId: ELASTICSEARCH_CONNECTOR_TYPE_ID,
    config: { selectedActions: ['search'] },
  },
  execute,
}: {
  hits?: unknown[];
  connector?: Record<string, unknown>;
  execute?: jest.Mock;
} = {}) => {
  const actionsClient = {
    get: jest.fn().mockResolvedValue({ id: 'remote-es', ...connector }),
    execute: execute ?? jest.fn().mockResolvedValue({ status: 'ok', data: { hits: { hits } } }),
  };
  return { context: { actionsClient } as unknown as AdapterContext, actionsClient };
};

describe('elastic alerts adapter', () => {
  describe('resolve', () => {
    it('resolves one alert that was active when the post arrived', async () => {
      const { context, actionsClient } = createContext();
      await expect(
        elasticAlertsAdapter.resolve(proposal(), { postReceivedAt: POST }, context)
      ).resolves.toEqual({
        ref: {
          source: 'elastic',
          connector_id: 'remote-es',
          alert_uuid: 'alert-1',
          instance_id: 'host-a',
          rule_id: 'rule-1',
          rule_name: 'High error rate',
          rule_type_id: '.es-query',
          alert_start: '2026-11-24T09:58:00.000Z',
        },
      });
      expect(actionsClient.execute).toHaveBeenCalledWith({
        actionId: 'remote-es',
        params: {
          subAction: 'search',
          subActionParams: expect.objectContaining({
            index: '.alerts-*',
            query: { bool: { filter: [{ term: { 'kibana.alert.uuid': 'alert-1' } }] } },
          }),
        },
      });
    });

    it('looks an alert up by rule and instance when the post has no alert id', async () => {
      const { context, actionsClient } = createContext();
      await elasticAlertsAdapter.resolve(
        proposal({ alert_id: null, rule_id: 'rule-1', instance_key: 'host-a' }),
        { postReceivedAt: POST },
        context
      );
      expect(actionsClient.execute.mock.calls[0][0].params.subActionParams.query).toEqual({
        bool: {
          filter: [
            { term: { 'kibana.alert.rule.uuid': 'rule-1' } },
            { term: { 'kibana.alert.instance.id': 'host-a' } },
          ],
        },
      });
    });

    it('reads nested alert documents', async () => {
      const { context } = createContext({
        hits: [
          {
            _source: {
              kibana: {
                alert: {
                  uuid: 'alert-1',
                  status: 'active',
                  start: '2026-11-24T09:58:00.000Z',
                },
              },
            },
          },
        ],
      });
      await expect(
        elasticAlertsAdapter.resolve(proposal(), { postReceivedAt: POST }, context)
      ).resolves.toEqual({
        ref: {
          source: 'elastic',
          connector_id: 'remote-es',
          alert_uuid: 'alert-1',
          alert_start: '2026-11-24T09:58:00.000Z',
        },
      });
    });

    it.each([
      ['a local alert', proposal({ connector_id: 'local' }), 'no_readable_connector'],
      ['no connector', proposal({ connector_id: null }), 'no_readable_connector'],
      ['no identity', proposal({ alert_id: null, rule_id: 'rule-1' }), 'insufficient_identity'],
    ])('does not search for %s', async (_, input, reason) => {
      const { context, actionsClient } = createContext();
      await expect(
        elasticAlertsAdapter.resolve(input, { postReceivedAt: POST }, context)
      ).resolves.toMatchObject({ untrackable: reason });
      expect(actionsClient.execute).not.toHaveBeenCalled();
    });

    it.each([
      ['another connector type', { actionTypeId: '.slack', config: {} }],
      [
        'a connector with search turned off',
        { actionTypeId: ELASTICSEARCH_CONNECTOR_TYPE_ID, config: { selectedActions: ['esql'] } },
      ],
    ])('needs a readable connector, not %s', async (_, connector) => {
      const { context } = createContext({ connector });
      await expect(
        elasticAlertsAdapter.resolve(proposal(), { postReceivedAt: POST }, context)
      ).resolves.toMatchObject({ untrackable: 'no_readable_connector' });
    });

    it.each([
      ['an authentication error', 'Elasticsearch authentication failed', 'access_denied'],
      [
        'a privilege error',
        'security_exception: action [indices:data/read/search] is unauthorized',
        'access_denied',
      ],
      ['another error', 'connect ECONNREFUSED', 'no_readable_connector'],
    ])('maps %s', async (_, serviceMessage, reason) => {
      const { context } = createContext({
        execute: jest
          .fn()
          .mockResolvedValue({ status: 'error', message: 'failed', serviceMessage }),
      });
      await expect(
        elasticAlertsAdapter.resolve(proposal(), { postReceivedAt: POST }, context)
      ).resolves.toEqual({ untrackable: reason, detail: serviceMessage });
    });

    it('reports an alert it cannot find', async () => {
      const { context } = createContext({ hits: [] });
      await expect(
        elasticAlertsAdapter.resolve(proposal(), { postReceivedAt: POST }, context)
      ).resolves.toEqual({ untrackable: 'not_found' });
    });

    it('rejects an alert that was not active when the post arrived', async () => {
      const { context } = createContext({
        hits: [alertDoc({ 'kibana.alert.start': '2026-11-24T11:00:00.000Z' })],
      });
      await expect(
        elasticAlertsAdapter.resolve(proposal(), { postReceivedAt: POST }, context)
      ).resolves.toEqual({ untrackable: 'inconsistent_timing' });
    });

    it('rejects a rule and instance that match more than one active alert', async () => {
      const { context } = createContext({
        hits: [alertDoc(), alertDoc({ 'kibana.alert.uuid': 'alert-2' })],
      });
      await expect(
        elasticAlertsAdapter.resolve(
          proposal({ alert_id: null, rule_id: 'rule-1', instance_key: 'host-a' }),
          { postReceivedAt: POST },
          context
        )
      ).resolves.toMatchObject({ untrackable: 'ambiguous' });
    });

    it('accepts several documents of the same alert', async () => {
      const { context } = createContext({ hits: [alertDoc(), alertDoc()] });
      await expect(
        elasticAlertsAdapter.resolve(proposal(), { postReceivedAt: POST }, context)
      ).resolves.toHaveProperty('ref.alert_uuid', 'alert-1');
    });
  });

  describe('wasActiveAt', () => {
    it.each([
      ['started before and still active', { start: '2026-11-24T09:00:00.000Z' }, true],
      ['started within clock tolerance after', { start: '2026-11-24T10:01:30.000Z' }, true],
      ['started well after', { start: '2026-11-24T10:05:00.000Z' }, false],
      [
        'ended before',
        { start: '2026-11-24T09:00:00.000Z', end: '2026-11-24T09:30:00.000Z' },
        false,
      ],
      [
        'ended just before, within tolerance',
        { start: '2026-11-24T09:00:00.000Z', end: '2026-11-24T09:59:00.000Z' },
        true,
      ],
      ['without a start', {}, false],
    ])('an alert that %s', (_, doc, expected) => {
      expect(wasActiveAt(doc, POST)).toBe(expected);
    });
  });
});
