/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { DetectionRulesApi } from './detection_rules_api';
import type { DetectionRuleResponse } from '../../common/api';

const makeRule = (overrides: Partial<DetectionRuleResponse> = {}): DetectionRuleResponse =>
  ({
    id: 'rule-1',
    rule_id: 'sig-1',
    revision: 0,
    source: { type: 'internal' },
    created_at: '2024-01-01T00:00:00Z',
    created_by: 'user',
    updated_at: '2024-01-01T00:00:00Z',
    updated_by: 'user',
    enabled: true,
    version: 1,
    name: 'Test Rule',
    description: 'desc',
    tags: [],
    severity: 'low',
    risk_score: 21,
    max_signals: 100,
    threat: [],
    setup: '',
    references: [],
    false_positives: [],
    author: [],
    related_integrations: [],
    required_fields: [],
    schedule: { interval: '5m' },
    type: 'query',
    index: ['logs-*'],
    query: 'host.name: *',
    language: 'kuery',
    ...overrides,
  } as DetectionRuleResponse);

const makeHttp = (overrides: Partial<HttpStart> = {}): jest.Mocked<HttpStart> =>
  ({
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<HttpStart>);

describe('DetectionRulesApi', () => {
  describe('listRules', () => {
    it('calls GET /api/detection_engine/v2/rules with empty params by default', async () => {
      const http = makeHttp();
      const mockResponse = { page: 1, per_page: 20, total: 0, data: [] };
      http.get.mockResolvedValue(mockResponse);

      const api = new DetectionRulesApi(http);
      const result = await api.listRules();

      expect(http.get).toHaveBeenCalledWith('/api/detection_engine/v2/rules', {
        query: {},
      });
      expect(result).toBe(mockResponse);
    });

    it('forwards structured filters to the query params', async () => {
      const http = makeHttp();
      http.get.mockResolvedValue({ page: 1, per_page: 20, total: 0, data: [] });

      const api = new DetectionRulesApi(http);
      await api.listRules({
        enabled: true,
        type: ['query'],
        severity: ['high', 'critical'],
        tags: ['prod'],
        rule_ids: ['sig-1'],
        search: 'my rule',
      });

      expect(http.get).toHaveBeenCalledWith('/api/detection_engine/v2/rules', {
        query: {
          enabled: true,
          type: ['query'],
          severity: ['high', 'critical'],
          tags: ['prod'],
          rule_ids: ['sig-1'],
          search: 'my rule',
        },
      });
    });

    it('forwards sort and pagination params', async () => {
      const http = makeHttp();
      http.get.mockResolvedValue({ page: 2, per_page: 10, total: 50, data: [] });

      const api = new DetectionRulesApi(http);
      await api.listRules({ sort_field: 'name', sort_order: 'asc', page: 2, per_page: 10 });

      expect(http.get).toHaveBeenCalledWith('/api/detection_engine/v2/rules', {
        query: { sort_field: 'name', sort_order: 'asc', page: 2, per_page: 10 },
      });
    });
  });

  describe('enableRule', () => {
    it('calls POST /api/detection_engine/v2/rules/{id}/_enable', async () => {
      const http = makeHttp();
      const rule = makeRule({ enabled: true });
      http.post.mockResolvedValue(rule);

      const api = new DetectionRulesApi(http);
      const result = await api.enableRule('rule-1');

      expect(http.post).toHaveBeenCalledWith('/api/detection_engine/v2/rules/rule-1/_enable');
      expect(result).toBe(rule);
    });

    it('encodes special characters in the rule id', async () => {
      const http = makeHttp();
      http.post.mockResolvedValue(makeRule());

      const api = new DetectionRulesApi(http);
      await api.enableRule('rule/with/slashes');

      expect(http.post).toHaveBeenCalledWith(
        '/api/detection_engine/v2/rules/rule%2Fwith%2Fslashes/_enable'
      );
    });
  });

  describe('disableRule', () => {
    it('calls POST /api/detection_engine/v2/rules/{id}/_disable', async () => {
      const http = makeHttp();
      const rule = makeRule({ enabled: false });
      http.post.mockResolvedValue(rule);

      const api = new DetectionRulesApi(http);
      const result = await api.disableRule('rule-1');

      expect(http.post).toHaveBeenCalledWith('/api/detection_engine/v2/rules/rule-1/_disable');
      expect(result).toBe(rule);
    });
  });

  describe('deleteRule', () => {
    it('calls DELETE /api/detection_engine/v2/rules/{id}', async () => {
      const http = makeHttp();
      const rule = makeRule();
      http.delete.mockResolvedValue(rule);

      const api = new DetectionRulesApi(http);
      const result = await api.deleteRule('rule-1');

      expect(http.delete).toHaveBeenCalledWith('/api/detection_engine/v2/rules/rule-1');
      expect(result).toBe(rule);
    });
  });
});
