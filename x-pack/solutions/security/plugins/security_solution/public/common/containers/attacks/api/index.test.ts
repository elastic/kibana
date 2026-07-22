/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import {
  DETECTION_ENGINE_ATTACKS_SEARCH_URL,
  DETECTION_ENGINE_ATTACKS_STATUS_URL,
  DETECTION_ENGINE_ATTACKS_TAGS_URL,
  DETECTION_ENGINE_ATTACKS_ASSIGNEES_URL,
} from '../../../../../common/constants';
import { KibanaServices } from '../../../lib/kibana';
import * as api from '.';

jest.mock('../../../lib/kibana');
const mockKibanaServices = KibanaServices.get as jest.Mock;

const signal = {} as AbortSignal;
const ATTACKS_API_VERSION = '2023-10-31';

describe('Attacks API', () => {
  let mockHttp: ReturnType<typeof coreMock.createStart>['http'];

  beforeEach(() => {
    const coreStart = coreMock.createStart({ basePath: '/mock' });
    mockHttp = coreStart.http;
    mockKibanaServices.mockReturnValue(coreStart);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchAttacks', () => {
    it('calls http.post with correct params', async () => {
      const query = { query: { match_all: {} } };
      await api.searchAttacks({ query, signal });
      expect(mockHttp.post).toHaveBeenCalledWith(DETECTION_ENGINE_ATTACKS_SEARCH_URL, {
        version: ATTACKS_API_VERSION,
        body: JSON.stringify(query),
        signal,
      });
    });
  });

  describe('setAttacksStatus', () => {
    it('calls http.post with correct params', async () => {
      const body = {
        ids: ['attack-1', 'attack-2'],
        status: 'closed' as const,
        update_related_alerts: true,
      };
      await api.setAttacksStatus({ body, signal });
      expect(mockHttp.post).toHaveBeenCalledWith(DETECTION_ENGINE_ATTACKS_STATUS_URL, {
        version: ATTACKS_API_VERSION,
        body: JSON.stringify(body),
        signal,
      });
    });
  });

  describe('setAttacksTags', () => {
    it('calls http.post with correct params', async () => {
      const body = {
        tags: {
          tags_to_add: ['tag-1'],
          tags_to_remove: [],
        },
        ids: ['attack-1', 'attack-2'],
        update_related_alerts: false,
      };
      await api.setAttacksTags({ body, signal });
      expect(mockHttp.post).toHaveBeenCalledWith(DETECTION_ENGINE_ATTACKS_TAGS_URL, {
        version: ATTACKS_API_VERSION,
        body: JSON.stringify(body),
        signal,
      });
    });
  });

  describe('setAttacksAssignees', () => {
    it('calls http.post with correct params', async () => {
      const body = {
        assignees: {
          add: ['user-1'],
          remove: [],
        },
        ids: ['attack-1', 'attack-2'],
        update_related_alerts: true,
      };
      await api.setAttacksAssignees({ body, signal });
      expect(mockHttp.post).toHaveBeenCalledWith(DETECTION_ENGINE_ATTACKS_ASSIGNEES_URL, {
        version: ATTACKS_API_VERSION,
        body: JSON.stringify(body),
        signal,
      });
    });
  });
});
