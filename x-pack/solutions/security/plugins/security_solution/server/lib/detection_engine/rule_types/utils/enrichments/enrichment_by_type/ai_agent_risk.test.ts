/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreCRUDClient } from '@kbn/entity-store/server';
import { ruleExecutionLogMock } from '../../../../rule_monitoring/mocks';
import { createAlert } from '../__mocks__/alerts';
import type { EnrichmentFunction } from '../types';
import {
  ALERT_AI_AGENT_RISK_SCORE_CALCULATED_LEVEL,
  ALERT_AI_AGENT_RISK_SCORE_CALCULATED_SCORE_NORM,
  ALERT_ENTITY_ID,
} from '../../../../../../../common/field_maps/field_names';
import { createV2AiAgentRiskEnrichments } from './ai_agent_risk';

const AGENT_ID = 'ai_agent:claude_code@host-1@ec2-user';

const agentFields = (overrides: Record<string, unknown> = {}) => ({
  host: { id: 'host-1', name: 'build-server' },
  user: { name: 'ec2-user' },
  process: {
    name: 'claude',
    ai_agent: { name: 'claude_code', is_descendant: false },
  },
  ...overrides,
});

const makeCrudClient = (
  entities: Array<{ id: string; fields?: Record<string, unknown[]> }>
): EntityStoreCRUDClient =>
  ({
    listEntities: jest.fn().mockImplementation(({ filter }) => {
      const requestedIds: string[] = filter.terms['entity.id'];
      const found = entities.filter(({ id }) => requestedIds.includes(id));
      return Promise.resolve({
        entities: found.map(({ id }) => ({ entity: { id } })),
        fields: found.map(({ fields }) => fields ?? {}),
      });
    }),
  } as unknown as EntityStoreCRUDClient);

const applyAll = (
  event: ReturnType<typeof createAlert>,
  fns: EnrichmentFunction[] = []
): ReturnType<typeof createAlert> => fns.reduce((acc, fn) => fn(acc), event);

describe('createV2AiAgentRiskEnrichments', () => {
  const logger = ruleExecutionLogMock.forExecutors.create();

  const run = async (
    events: Array<ReturnType<typeof createAlert>>,
    entityStoreCrudClient: EntityStoreCRUDClient
  ) => createV2AiAgentRiskEnrichments({ entityStoreCrudClient, logger, events, spaceId: 'default' });

  it("stamps the agent's own event when the agent is in the store", async () => {
    const event = createAlert('1', agentFields());
    const crudClient = makeCrudClient([{ id: AGENT_ID }]);

    const result = await run([event], crudClient);

    expect(crudClient.listEntities).toHaveBeenCalledWith(
      expect.objectContaining({ filter: { terms: { 'entity.id': [AGENT_ID] } } })
    );
    expect(applyAll(event, result['1'])._source[ALERT_ENTITY_ID]).toEqual([AGENT_ID]);
  });

  it('stamps a descendant with the agent that spawned it', async () => {
    const event = createAlert(
      '1',
      agentFields({
        process: { name: 'curl', ai_agent: { name: 'claude_code', is_descendant: true } },
      })
    );

    const result = await run([event], makeCrudClient([{ id: AGENT_ID }]));

    expect(applyAll(event, result['1'])._source[ALERT_ENTITY_ID]).toEqual([AGENT_ID]);
  });

  it('stamps a descendant whose flag is a string, as some sources send it', async () => {
    const event = createAlert(
      '1',
      agentFields({
        process: { name: 'git', ai_agent: { name: 'claude_code', is_descendant: 'true' } },
      })
    );

    const result = await run([event], makeCrudClient([{ id: AGENT_ID }]));

    expect(applyAll(event, result['1'])._source[ALERT_ENTITY_ID]).toEqual([AGENT_ID]);
  });

  it('does not stamp a sudo child running as root, because no root agent exists', async () => {
    const event = createAlert(
      '1',
      agentFields({
        user: { name: 'root' },
        process: {
          name: 'sudo',
          parent: { user: { name: 'ec2-user' } },
          ai_agent: { name: 'claude_code', is_descendant: true },
        },
      })
    );
    const crudClient = makeCrudClient([{ id: AGENT_ID }]);

    const result = await run([event], crudClient);

    expect(crudClient.listEntities).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: { terms: { 'entity.id': ['ai_agent:claude_code@host-1@root'] } },
      })
    );
    expect(result).toEqual({});
  });

  it('does not stamp an agent that is not in the store', async () => {
    const event = createAlert('1', agentFields());

    const result = await run([event], makeCrudClient([]));

    expect(result).toEqual({});
  });

  it.each([
    ['process.ai_agent.name', agentFields({ process: { name: 'claude' } })],
    ['host.id', agentFields({ host: { name: 'build-server' } })],
    ['user.name', agentFields({ user: {} })],
  ])('skips an event without %s', async (_field, source) => {
    const crudClient = makeCrudClient([{ id: AGENT_ID }]);

    const result = await run([createAlert('1', source)], crudClient);

    expect(crudClient.listEntities).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it('reads flattened agent fields', async () => {
    const event = createAlert('1', {
      'process.ai_agent.name': 'claude_code',
      'process.ai_agent.is_descendant': true,
      'host.id': 'host-1',
      'user.name': 'ec2-user',
    });

    const result = await run([event], makeCrudClient([{ id: AGENT_ID }]));

    expect(applyAll(event, result['1'])._source[ALERT_ENTITY_ID]).toEqual([AGENT_ID]);
  });

  it("copies the agent's risk onto the alert", async () => {
    const event = createAlert('1', agentFields());
    const crudClient = makeCrudClient([
      {
        id: AGENT_ID,
        fields: {
          'entity.risk.calculated_level': ['High'],
          'entity.risk.calculated_score_norm': [72.5],
        },
      },
    ]);

    const result = await run([event], crudClient);
    const enriched = applyAll(event, result['1']);

    expect(enriched._source).toMatchObject({
      [ALERT_ENTITY_ID]: [AGENT_ID],
      process: { ai_agent: { risk: { calculated_level: 'High', calculated_score_norm: 72.5 } } },
    });
    expect(enriched._source).not.toHaveProperty([ALERT_AI_AGENT_RISK_SCORE_CALCULATED_LEVEL]);
    expect(enriched._source).not.toHaveProperty([ALERT_AI_AGENT_RISK_SCORE_CALCULATED_SCORE_NORM]);
  });

  it('appends the agent stamp after host and user stamps', async () => {
    const event = createAlert('1', {
      ...agentFields(),
      [ALERT_ENTITY_ID]: ['host:host-1', 'user:ec2-user@host-1@local'],
    });

    const result = await run([event], makeCrudClient([{ id: AGENT_ID }]));

    expect(applyAll(event, result['1'])._source[ALERT_ENTITY_ID]).toEqual([
      'host:host-1',
      'user:ec2-user@host-1@local',
      AGENT_ID,
    ]);
  });
});
