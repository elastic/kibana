/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  transformESToAlertSummary,
  transformESSearchToAlertSummary,
  transformToUpdateScheme,
  transformToCreateScheme,
  getUpdateScript,
} from './helpers';
import {
  mockEsAlertSummarySchema,
  getUpdateAlertSummarySchemaMock,
  getAlertSummarySearchEsMock,
  getCreateAlertSummarySchemaMock,
} from '../../__mocks__/alert_summary.mock';
import { AuthenticatedUser } from '@kbn/core-security-common';
import { mockAuthenticatedUser } from '@kbn/core-security-common/src/authentication/authenticated_user.mock';

const mockEsSearchResponse = getAlertSummarySearchEsMock();
const mockAlertSummaryUpdateProps = getUpdateAlertSummarySchemaMock();
const mockUser = mockAuthenticatedUser({
  authentication_provider: { type: 'basic', name: 'basic1' },
});
describe('helpers', () => {
  describe('transformToUpdateScheme', () => {
    it('should transform update props to the correct update schema', () => {
      const user = mockUser;
      const updatedAt = '2023-01-01T00:00:00.000Z';
      const result = transformToUpdateScheme(user, updatedAt, mockAlertSummaryUpdateProps);

      expect(result).toEqual({
        id: mockAlertSummaryUpdateProps.id,
        updated_at: updatedAt,
        updated_by: user.username,
        summary: mockAlertSummaryUpdateProps.summary,
      });
    });
  });

  describe('transformToCreateScheme', () => {
    it('should transform create props to the correct create schema', () => {
      const user = mockUser;
      const updatedAt = '2023-01-01T00:00:00.000Z';
      const result = transformToCreateScheme(user, updatedAt, getCreateAlertSummarySchemaMock());

      expect(result).toEqual({
        '@timestamp': updatedAt,
        updated_at: updatedAt,
        updated_by: user.username,
        created_at: updatedAt,
        created_by: user.username,
        summary: 'test content',
        alert_id: '1234',
        users: [
          {
            id: user.profile_uid,
            name: user.username,
          },
        ],
        replacements: [],
      });
    });
  });

  describe('getUpdateScript', () => {
    it('should generate the correct update script', () => {
      const alertSummary = transformToUpdateScheme(
        { username: 'test_user', profile_uid: '123' } as AuthenticatedUser,
        '2023-01-01T00:00:00.000Z',
        mockAlertSummaryUpdateProps
      );
      const result = getUpdateScript({ alertSummary, isPatch: true });

      expect(result).toEqual({
        script: {
          source: `
    if (params.assignEmpty == true || params.containsKey('summary')) {
      ctx._source.summary = params.summary;
    }
    if (params.assignEmpty == true || params.containsKey('recommended_actions')) {
      ctx._source.recommended_actions = params.recommended_actions;
    }
    ctx._source.updated_at = params.updated_at;
  `,
          lang: 'painless',
          params: {
            ...alertSummary,
            assignEmpty: false,
          },
        },
      });
    });
  });

  describe('transformESToAlertSummary', () => {
    it('should transform Elasticsearch hit to alert summary', () => {
      const result = transformESToAlertSummary([mockEsAlertSummarySchema]);

      expect(result).toEqual([
        {
          id: mockEsAlertSummarySchema.id,
          timestamp: mockEsAlertSummarySchema['@timestamp'],
          createdAt: mockEsAlertSummarySchema.created_at,
          updatedAt: mockEsAlertSummarySchema.updated_at,
          namespace: mockEsAlertSummarySchema.namespace,
          summary: mockEsAlertSummarySchema.summary,
          recommendedActions: mockEsAlertSummarySchema.recommended_actions,
          alertId: mockEsAlertSummarySchema.alert_id,
          createdBy: mockEsAlertSummarySchema.created_by,
          updatedBy: mockEsAlertSummarySchema.updated_by,
          users: mockEsAlertSummarySchema.users,
          replacements: {},
        },
      ]);
    });
  });

  describe('transformESSearchToAlertSummary', () => {
    it('should transform Elasticsearch search response to alert summaries', () => {
      const result = transformESSearchToAlertSummary(mockEsSearchResponse);

      expect(result).toEqual([
        {
          id: mockEsAlertSummarySchema.id,
          timestamp: mockEsAlertSummarySchema['@timestamp'],
          createdAt: mockEsAlertSummarySchema.created_at,
          updatedAt: mockEsAlertSummarySchema.updated_at,
          namespace: mockEsAlertSummarySchema.namespace,
          summary: mockEsAlertSummarySchema.summary,
          recommendedActions: mockEsAlertSummarySchema.recommended_actions,
          alertId: mockEsAlertSummarySchema.alert_id,
          createdBy: mockEsAlertSummarySchema.created_by,
          updatedBy: mockEsAlertSummarySchema.updated_by,
          users: mockEsAlertSummarySchema.users,
          replacements: {},
        },
      ]);
    });
  });
});
