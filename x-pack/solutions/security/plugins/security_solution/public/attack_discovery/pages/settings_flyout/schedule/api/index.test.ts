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
  ATTACK_DISCOVERY_SCHEDULES,
  ATTACK_DISCOVERY_SCHEDULES_BY_ID,
  ATTACK_DISCOVERY_SCHEDULES_BY_ID_DISABLE,
  ATTACK_DISCOVERY_SCHEDULES_BY_ID_ENABLE,
  ATTACK_DISCOVERY_SCHEDULES_FIND,
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
  });

  it('should send a create schedule POST request', async () => {
    const body = { test: 'test schedule' } as unknown as AttackDiscoveryScheduleCreateProps;
    await createAttackDiscoverySchedule({ body });

    expect(mockKibanaServices().http.post).toHaveBeenCalledWith(ATTACK_DISCOVERY_SCHEDULES, {
      body: JSON.stringify(body),
      version: '1',
    });
  });

  it('should send a fetch schedule GET request', async () => {
    const id = 'test-id-1';
    await getAttackDiscoverySchedule({ id });

    expect(mockKibanaServices().http.get).toHaveBeenCalledWith(
      replaceParams(ATTACK_DISCOVERY_SCHEDULES_BY_ID, { id }),
      { version: '1' }
    );
  });

  it('should send an update schedule PUT request', async () => {
    const id = 'test-id-2';
    const body = { test: 'test schedule' } as unknown as AttackDiscoveryScheduleUpdateProps;
    await updateAttackDiscoverySchedule({ id, body });

    expect(mockKibanaServices().http.put).toHaveBeenCalledWith(
      replaceParams(ATTACK_DISCOVERY_SCHEDULES_BY_ID, { id }),
      { body: JSON.stringify(body), version: '1' }
    );
  });

  it('should send a delete schedule DELETE request', async () => {
    const id = 'test-id-3';
    await deleteAttackDiscoverySchedule({ id });

    expect(mockKibanaServices().http.delete).toHaveBeenCalledWith(
      replaceParams(ATTACK_DISCOVERY_SCHEDULES_BY_ID, { id }),
      { version: '1' }
    );
  });

  it('should send an enable schedule POST request', async () => {
    const id = 'test-id-4';
    await enableAttackDiscoverySchedule({ id });

    expect(mockKibanaServices().http.post).toHaveBeenCalledWith(
      replaceParams(ATTACK_DISCOVERY_SCHEDULES_BY_ID_ENABLE, { id }),
      { version: '1' }
    );
  });

  it('should send a disable schedule POST request', async () => {
    const id = 'test-id-5';
    await disableAttackDiscoverySchedule({ id });

    expect(mockKibanaServices().http.post).toHaveBeenCalledWith(
      replaceParams(ATTACK_DISCOVERY_SCHEDULES_BY_ID_DISABLE, { id }),
      { version: '1' }
    );
  });

  it('should send a find schedules GET request', async () => {
    const params = {
      page: 10,
      perPage: 123,
      sortField: 'test-field-1',
      sortDirection: 'desc' as 'asc' | 'desc',
    };
    await findAttackDiscoverySchedule(params);

    expect(mockKibanaServices().http.get).toHaveBeenCalledWith(ATTACK_DISCOVERY_SCHEDULES_FIND, {
      version: '1',
      query: { ...params },
    });
  });

  it('should send a fetch rule types GET request', async () => {
    await fetchRuleTypes();

    expect(mockKibanaServices().http.get).toHaveBeenCalledWith(ALERTING_RULE_TYPES_URL, {});
  });
});
