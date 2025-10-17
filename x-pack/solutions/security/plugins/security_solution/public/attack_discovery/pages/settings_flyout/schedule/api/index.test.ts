/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { replaceParams } from '@kbn/openapi-common/shared';
import type {
  AttackDiscoveryScheduleCreateProps,
  AttackDiscoveryScheduleUpdateProps,
} from '@kbn/elastic-assistant-common';
import {
  transformAttackDiscoveryScheduleCreatePropsToApi,
  transformAttackDiscoveryScheduleUpdatePropsToApi,
  ATTACK_DISCOVERY_SCHEDULES,
  ATTACK_DISCOVERY_SCHEDULES_BY_ID,
  ATTACK_DISCOVERY_SCHEDULES_BY_ID_DISABLE,
  ATTACK_DISCOVERY_SCHEDULES_BY_ID_ENABLE,
  ATTACK_DISCOVERY_SCHEDULES_FIND,
  ATTACK_DISCOVERY_INTERNAL_SCHEDULES,
  ATTACK_DISCOVERY_INTERNAL_SCHEDULES_BY_ID,
  ATTACK_DISCOVERY_INTERNAL_SCHEDULES_BY_ID_DISABLE,
  ATTACK_DISCOVERY_INTERNAL_SCHEDULES_BY_ID_ENABLE,
  ATTACK_DISCOVERY_INTERNAL_SCHEDULES_FIND,
  API_VERSIONS,
} from '@kbn/elastic-assistant-common';

import {
  ALERTING_RULE_TYPES_URL,
  createAttackDiscoverySchedule,
  deleteAttackDiscoverySchedule,
  disableAttackDiscoverySchedule,
  enableAttackDiscoverySchedule,
  fetchRuleTypes,
  findAttackDiscoverySchedule,
  getAttackDiscoverySchedule,
  updateAttackDiscoverySchedule,
} from '.';
import { KibanaServices } from '../../../../../common/lib/kibana';

jest.mock('../../../../../common/lib/kibana');
const mockKibanaServices = KibanaServices.get as jest.Mock;

describe('Schedule API', () => {
  beforeEach(() => {
    mockKibanaServices.mockReturnValue(coreMock.createStart({ basePath: '/mock' }));
    jest.clearAllMocks();
  });

  const body: AttackDiscoveryScheduleCreateProps = {
    name: 'Test Schedule',
    enabled: true,
    params: {
      alertsIndexPattern: '.alerts-security.alerts-default',
      apiConfig: {
        connectorId: 'test-connector',
        actionTypeId: '.gen-ai',
        name: 'Test AI',
      },
      size: 100,
    },
    schedule: {
      interval: '1h',
    },
  };

  const updateBody: AttackDiscoveryScheduleUpdateProps = {
    name: 'Updated Test Schedule',
    params: {
      alertsIndexPattern: '.alerts-security.alerts-default',
      apiConfig: {
        connectorId: 'updated-test-connector',
        actionTypeId: '.gen-ai',
        name: 'Updated Test AI',
      },
      size: 150,
    },
    schedule: {
      interval: '2h',
    },
    actions: [],
  };
  const id = 'test-id';
  const params = {
    page: 10,
    perPage: 123,
    sortField: 'test-field-1',
    sortDirection: 'desc' as 'asc' | 'desc',
  };

  describe('when attackDiscoveryPublicApiEnabled is true', () => {
    const attackDiscoveryPublicApiEnabled = true;

    it('should send a create schedule POST request to the public API', async () => {
      await createAttackDiscoverySchedule({ body, attackDiscoveryPublicApiEnabled });

      const expectedTransformedBody = transformAttackDiscoveryScheduleCreatePropsToApi(body);
      expect(mockKibanaServices().http.post).toHaveBeenCalledWith(
        ATTACK_DISCOVERY_SCHEDULES,
        expect.objectContaining({
          body: JSON.stringify(expectedTransformedBody),
          version: API_VERSIONS.public.v1,
        })
      );
    });

    it('should send a fetch schedule GET request to the public API', async () => {
      await getAttackDiscoverySchedule({ id, attackDiscoveryPublicApiEnabled });
      expect(mockKibanaServices().http.get).toHaveBeenCalledWith(
        replaceParams(ATTACK_DISCOVERY_SCHEDULES_BY_ID, { id }),
        expect.objectContaining({ version: API_VERSIONS.public.v1 })
      );
    });

    it('should send an update schedule PUT request to the public API', async () => {
      const expectedUpdateTransformedBody =
        transformAttackDiscoveryScheduleUpdatePropsToApi(updateBody);
      await updateAttackDiscoverySchedule({
        id,
        body: updateBody,
        attackDiscoveryPublicApiEnabled,
      });
      expect(mockKibanaServices().http.put).toHaveBeenCalledWith(
        replaceParams(ATTACK_DISCOVERY_SCHEDULES_BY_ID, { id }),
        expect.objectContaining({
          body: JSON.stringify(expectedUpdateTransformedBody),
          version: API_VERSIONS.public.v1,
        })
      );
    });

    it('should send a delete schedule DELETE request to the public API', async () => {
      await deleteAttackDiscoverySchedule({ id, attackDiscoveryPublicApiEnabled });
      expect(mockKibanaServices().http.delete).toHaveBeenCalledWith(
        replaceParams(ATTACK_DISCOVERY_SCHEDULES_BY_ID, { id }),
        expect.objectContaining({ version: API_VERSIONS.public.v1 })
      );
    });

    it('should send an enable schedule POST request to the public API', async () => {
      await enableAttackDiscoverySchedule({ id, attackDiscoveryPublicApiEnabled });
      expect(mockKibanaServices().http.post).toHaveBeenCalledWith(
        replaceParams(ATTACK_DISCOVERY_SCHEDULES_BY_ID_ENABLE, { id }),
        expect.objectContaining({ version: API_VERSIONS.public.v1 })
      );
    });

    it('should send a disable schedule POST request to the public API', async () => {
      await disableAttackDiscoverySchedule({ id, attackDiscoveryPublicApiEnabled });
      expect(mockKibanaServices().http.post).toHaveBeenCalledWith(
        replaceParams(ATTACK_DISCOVERY_SCHEDULES_BY_ID_DISABLE, { id }),
        expect.objectContaining({ version: API_VERSIONS.public.v1 })
      );
    });

    it('should send a find schedules GET request with snake_case query params to the public API', async () => {
      await findAttackDiscoverySchedule({ ...params, attackDiscoveryPublicApiEnabled });
      expect(mockKibanaServices().http.get).toHaveBeenCalledWith(
        ATTACK_DISCOVERY_SCHEDULES_FIND,
        expect.objectContaining({
          version: API_VERSIONS.public.v1,
          query: expect.objectContaining({
            page: params.page,
            per_page: params.perPage,
            sort_field: params.sortField,
            sort_direction: params.sortDirection,
          }),
        })
      );
    });
  });

  describe('when attackDiscoveryPublicApiEnabled is false', () => {
    const attackDiscoveryPublicApiEnabled = false;

    it('should send a create schedule POST request to the internal API', async () => {
      await createAttackDiscoverySchedule({ body, attackDiscoveryPublicApiEnabled });
      expect(mockKibanaServices().http.post).toHaveBeenCalledWith(
        ATTACK_DISCOVERY_INTERNAL_SCHEDULES,
        expect.objectContaining({ body: JSON.stringify(body), version: API_VERSIONS.internal.v1 })
      );
    });

    it('should send a fetch schedule GET request to the internal API', async () => {
      await getAttackDiscoverySchedule({ id, attackDiscoveryPublicApiEnabled });
      expect(mockKibanaServices().http.get).toHaveBeenCalledWith(
        replaceParams(ATTACK_DISCOVERY_INTERNAL_SCHEDULES_BY_ID, { id }),
        expect.objectContaining({ version: API_VERSIONS.internal.v1 })
      );
    });

    it('should send an update schedule PUT request to the internal API', async () => {
      await updateAttackDiscoverySchedule({
        id,
        body: updateBody,
        attackDiscoveryPublicApiEnabled,
      });
      expect(mockKibanaServices().http.put).toHaveBeenCalledWith(
        replaceParams(ATTACK_DISCOVERY_INTERNAL_SCHEDULES_BY_ID, { id }),
        expect.objectContaining({
          body: JSON.stringify(updateBody),
          version: API_VERSIONS.internal.v1,
        })
      );
    });

    it('should send a delete schedule DELETE request to the internal API', async () => {
      await deleteAttackDiscoverySchedule({ id, attackDiscoveryPublicApiEnabled });
      expect(mockKibanaServices().http.delete).toHaveBeenCalledWith(
        replaceParams(ATTACK_DISCOVERY_INTERNAL_SCHEDULES_BY_ID, { id }),
        expect.objectContaining({ version: API_VERSIONS.internal.v1 })
      );
    });

    it('should send an enable schedule POST request to the internal API', async () => {
      await enableAttackDiscoverySchedule({ id, attackDiscoveryPublicApiEnabled });
      expect(mockKibanaServices().http.post).toHaveBeenCalledWith(
        replaceParams(ATTACK_DISCOVERY_INTERNAL_SCHEDULES_BY_ID_ENABLE, { id }),
        expect.objectContaining({ version: API_VERSIONS.internal.v1 })
      );
    });

    it('should send a disable schedule POST request to the internal API', async () => {
      await disableAttackDiscoverySchedule({ id, attackDiscoveryPublicApiEnabled });
      expect(mockKibanaServices().http.post).toHaveBeenCalledWith(
        replaceParams(ATTACK_DISCOVERY_INTERNAL_SCHEDULES_BY_ID_DISABLE, { id }),
        expect.objectContaining({ version: API_VERSIONS.internal.v1 })
      );
    });

    it('should send a find schedules GET request to the internal API', async () => {
      await findAttackDiscoverySchedule({ ...params, attackDiscoveryPublicApiEnabled });
      expect(mockKibanaServices().http.get).toHaveBeenCalledWith(
        ATTACK_DISCOVERY_INTERNAL_SCHEDULES_FIND,
        expect.objectContaining({
          version: API_VERSIONS.internal.v1,
          query: expect.objectContaining(params),
        })
      );
    });
  });

  it('should send a fetch rule types GET request', async () => {
    await fetchRuleTypes();
    expect(mockKibanaServices().http.get).toHaveBeenCalledWith(ALERTING_RULE_TYPES_URL, {});
  });
});
