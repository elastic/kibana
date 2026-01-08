/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import {
  DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL,
  DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
  DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
  DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL,
} from '../../../../../common/constants';
import { KibanaServices } from '../../../lib/kibana';
import * as api from '.';

jest.mock('../../../lib/kibana');
const mockKibanaServices = KibanaServices.get as jest.Mock;

const signal = {} as AbortSignal;

describe('Unified Alerts API', () => {
  let mockHttp: ReturnType<typeof coreMock.createStart>['http'];

  beforeEach(() => {
    const coreStart = coreMock.createStart({ basePath: '/mock' });
    mockHttp = coreStart.http;
    mockKibanaServices.mockReturnValue(coreStart);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchUnifiedAlerts', () => {
    it('calls http.post with correct params', async () => {
      const query = { query: { match_all: {} } };
      await api.searchUnifiedAlerts({ query, signal });
      expect(mockHttp.post).toHaveBeenCalledWith(DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL, {
        version: '1',
        body: JSON.stringify(query),
        signal,
      });
    });
  });

  describe('setUnifiedAlertsWorkflowStatus', () => {
    it('calls http.post with correct params', async () => {
      const body = {
        signal_ids: ['alert-1', 'alert-2'],
        status: 'closed' as const,
      };
      await api.setUnifiedAlertsWorkflowStatus({ body, signal });
      expect(mockHttp.post).toHaveBeenCalledWith(
        DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
        {
          version: '1',
          body: JSON.stringify(body),
          signal,
        }
      );
    });
  });

  describe('setUnifiedAlertsTags', () => {
    it('calls http.post with correct params', async () => {
      const body = {
        tags: {
          tags_to_add: ['tag-1'],
          tags_to_remove: [],
        },
        ids: ['alert-1', 'alert-2'],
      };
      await api.setUnifiedAlertsTags({ body, signal });
      expect(mockHttp.post).toHaveBeenCalledWith(DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL, {
        version: '1',
        body: JSON.stringify(body),
        signal,
      });
    });
  });

  describe('setUnifiedAlertsAssignees', () => {
    it('calls http.post with correct params', async () => {
      const body = {
        assignees: {
          add: ['user-1'],
          remove: [],
        },
        ids: ['alert-1', 'alert-2'],
      };
      await api.setUnifiedAlertsAssignees({ body, signal });
      expect(mockHttp.post).toHaveBeenCalledWith(
        DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL,
        {
          version: '1',
          body: JSON.stringify(body),
          signal,
        }
      );
    });
  });
});
