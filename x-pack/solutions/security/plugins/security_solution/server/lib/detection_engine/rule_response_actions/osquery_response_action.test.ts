/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { RuleResponseOsqueryAction } from '../../../../common/api/detection_engine/model/rule_response_actions';
import type { AlertWithAgent } from './types';
import { osqueryResponseAction } from './osquery_response_action';
import { createMockEndpointAppContextService } from '../../../endpoint/mocks';

const createMockAlert = (overrides: Partial<AlertWithAgent> = {}): AlertWithAgent =>
  ({
    _id: 'alert-1',
    _index: '.alerts-default',
    agent: { id: 'agent-1', name: 'host-1', type: 'endpoint' },
    kibana: {
      alert: { rule: { uuid: 'rule-1', name: 'Test Rule' } },
      space_ids: [DEFAULT_SPACE_ID],
    },
    ...overrides,
  } as AlertWithAgent);

const createMockService = () => ({
  create: jest.fn().mockResolvedValue({}),
  stop: jest.fn(),
  logger: { error: jest.fn() } as unknown as Logger,
});

describe('osqueryResponseAction', () => {
  let mockService: ReturnType<typeof createMockService>;
  const endpointService = createMockEndpointAppContextService();

  beforeEach(() => {
    mockService = createMockService();
  });

  describe('pack_id passthrough', () => {
    it('passes pack_id when packId is set on the response action', async () => {
      const alerts = [
        createMockAlert(),
        createMockAlert({
          _id: 'alert-2',
          agent: { id: 'agent-2', name: 'host-2', type: 'endpoint' },
        }),
      ];

      const responseAction: RuleResponseOsqueryAction = {
        actionTypeId: '.osquery',
        params: {
          packId: 'my-pack-123',
          queries: [{ id: 'q1', query: 'SELECT * FROM uptime;' }],
        },
      };

      await osqueryResponseAction(responseAction, mockService, endpointService, { alerts });

      expect(mockService.create).toHaveBeenCalledTimes(1);
      expect(mockService.create).toHaveBeenCalledWith(
        expect.objectContaining({ pack_id: 'my-pack-123' }),
        expect.objectContaining({ space: { id: DEFAULT_SPACE_ID } })
      );
    });

    it('passes pack_id as undefined when no pack is configured', async () => {
      const alerts = [createMockAlert()];

      const responseAction: RuleResponseOsqueryAction = {
        actionTypeId: '.osquery',
        params: {
          query: 'SELECT * FROM processes;',
          ecsMapping: { 'process.name': { field: 'name' } },
          savedQueryId: 'saved-1',
        },
      };

      await osqueryResponseAction(responseAction, mockService, endpointService, { alerts });

      expect(mockService.create).toHaveBeenCalledTimes(1);
      const createParams = mockService.create.mock.calls[0][0];
      expect(createParams).not.toHaveProperty('pack_id');
      expect(createParams.saved_query_id).toBe('saved-1');
      expect(createParams.ecs_mapping).toEqual({ 'process.name': { field: 'name' } });
    });

    it('passes pack_id in per-alert calls when queries contain dynamic parameters', async () => {
      const alerts = [
        createMockAlert(),
        createMockAlert({
          _id: 'alert-2',
          agent: { id: 'agent-2', name: 'host-2', type: 'endpoint' },
        }),
      ];

      const responseAction: RuleResponseOsqueryAction = {
        actionTypeId: '.osquery',
        params: {
          packId: 'dynamic-pack-456',
          queries: [{ id: 'q1', query: 'SELECT * FROM users WHERE name = {{user.name}};' }],
        },
      };

      await osqueryResponseAction(responseAction, mockService, endpointService, { alerts });

      expect(mockService.create).toHaveBeenCalledTimes(2);
      expect(mockService.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          pack_id: 'dynamic-pack-456',
          agent_ids: ['agent-1'],
          alert_ids: ['alert-1'],
        }),
        expect.objectContaining({
          alertData: expect.objectContaining({ _id: 'alert-1' }),
        })
      );
      expect(mockService.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          pack_id: 'dynamic-pack-456',
          agent_ids: ['agent-2'],
          alert_ids: ['alert-2'],
        }),
        expect.objectContaining({
          alertData: expect.objectContaining({ _id: 'alert-2' }),
        })
      );
    });
  });
});
