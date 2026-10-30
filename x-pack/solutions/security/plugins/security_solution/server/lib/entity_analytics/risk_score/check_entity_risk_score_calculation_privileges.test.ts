/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import type { CheckPrivilegesPayload } from '@kbn/security-plugin/server';
import {
  getLatestEntityIndexPattern,
  getLegacySecurityLatestEntityIndexPattern,
} from '@kbn/entity-store/common';
import { checkEntityStoreIndexPrivileges } from '@kbn/entity-store/server';
import { getConfiguration } from '../risk_engine/utils/saved_object_configuration';
import { getRiskInputsIndex } from './get_risk_inputs_index';
import { getLookupIndexName } from './maintainer/lookup/lookup_index';
import { checkEntityRiskScoreCalculationPrivileges } from './check_entity_risk_score_calculation_privileges';

jest.mock('@kbn/entity-store/server', () => ({ checkEntityStoreIndexPrivileges: jest.fn() }));
jest.mock('../risk_engine/utils/saved_object_configuration');
jest.mock('./get_risk_inputs_index');

const ALERTS_INDEX = '.alerts-security.alerts-default';
const LOOKUP_INDEX = getLookupIndexName('default');
const ENTITY_STORE_LATEST = getLatestEntityIndexPattern('default');
const ENTITY_STORE_LATEST_LEGACY = getLegacySecurityLatestEntityIndexPattern('default');

type Granted = Record<string, string[]>;

const fullGrants: Granted = {
  [ALERTS_INDEX]: ['read', 'view_index_metadata'],
  'risk-score.risk-score-*': ['read', 'write'],
  [LOOKUP_INDEX]: ['read'],
  [ENTITY_STORE_LATEST]: ['view_index_metadata'],
};

// Answers the check from the grants, so dropping a requested index or privilege changes the result.
const buildSecurity = (granted: Granted) => {
  const security = securityMock.createStart();
  security.authz.checkPrivilegesDynamicallyWithRequest = jest.fn().mockReturnValue(
    jest.fn(async (payload: CheckPrivilegesPayload) => {
      const index = Object.fromEntries(
        Object.entries(payload.elasticsearch?.index ?? {}).map(([name, privileges]) => [
          name,
          privileges.map((privilege) => ({
            privilege,
            authorized: granted[name]?.includes(privilege) ?? false,
          })),
        ])
      );
      return {
        hasAllRequested: Object.values(index).every((privileges) =>
          privileges.every(({ authorized }) => authorized)
        ),
        privileges: { elasticsearch: { cluster: [], index }, kibana: [] },
      };
    })
  );
  return security;
};

// Like the real helper, returns the privileges of the latest index name that read/write passed on.
const mockEntityStoreAccess = (latestName: string, perms = { read: true, write: true }) =>
  (checkEntityStoreIndexPrivileges as jest.Mock).mockResolvedValue({
    has_read_permissions: perms.read,
    has_write_permissions: perms.write,
    privileges: {
      elasticsearch: { index: { [latestName]: { read: perms.read, write: perms.write } } },
    },
  });

describe('checkEntityRiskScoreCalculationPrivileges', () => {
  const request = httpServerMock.createKibanaRequest();
  const soClient = savedObjectsClientMock.create();
  const logger = loggerMock.create();

  const run = (granted: Granted) =>
    checkEntityRiskScoreCalculationPrivileges({
      request,
      security: buildSecurity(granted),
      namespace: 'default',
      soClient,
      logger,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    (getConfiguration as jest.Mock).mockResolvedValue({ dataViewId: 'data-view-id' });
    (getRiskInputsIndex as jest.Mock).mockResolvedValue({ index: ALERTS_INDEX });
    mockEntityStoreAccess(ENTITY_STORE_LATEST);
  });

  it('is true when every required privilege is granted', async () => {
    expect(await run(fullGrants)).toBe(true);
  });

  it('is false when view_index_metadata is missing on the alerts index', async () => {
    expect(await run({ ...fullGrants, [ALERTS_INDEX]: ['read'] })).toBe(false);
  });

  it('is false when read is missing on the alerts index', async () => {
    expect(await run({ ...fullGrants, [ALERTS_INDEX]: ['view_index_metadata'] })).toBe(false);
  });

  it('is false when write is missing on the risk score index', async () => {
    expect(await run({ ...fullGrants, 'risk-score.risk-score-*': ['read'] })).toBe(false);
  });

  it('is false when read is missing on the lookup index', async () => {
    expect(await run({ ...fullGrants, [LOOKUP_INDEX]: [] })).toBe(false);
  });

  it.each([
    ['read', { read: false, write: true }],
    ['write', { read: true, write: false }],
  ])('is false when the entity store %s access is missing', async (_, perms) => {
    mockEntityStoreAccess(ENTITY_STORE_LATEST, perms);

    expect(await run(fullGrants)).toBe(false);
  });

  it('is false when view_index_metadata is missing on the entity store latest index', async () => {
    expect(await run({ ...fullGrants, [ENTITY_STORE_LATEST]: [] })).toBe(false);
  });

  it('accepts view_index_metadata granted on the legacy Security-scoped latest index name', async () => {
    mockEntityStoreAccess(ENTITY_STORE_LATEST_LEGACY);

    expect(
      await run({
        ...fullGrants,
        [ENTITY_STORE_LATEST]: [],
        [ENTITY_STORE_LATEST_LEGACY]: ['view_index_metadata'],
      })
    ).toBe(true);
  });

  it('is false when read/write passed on the neutral name but view_index_metadata only on the legacy name', async () => {
    mockEntityStoreAccess(ENTITY_STORE_LATEST);

    expect(
      await run({
        ...fullGrants,
        [ENTITY_STORE_LATEST]: [],
        [ENTITY_STORE_LATEST_LEGACY]: ['view_index_metadata'],
      })
    ).toBe(false);
  });

  it('is false when read/write passed on the legacy name but view_index_metadata only on the neutral name', async () => {
    mockEntityStoreAccess(ENTITY_STORE_LATEST_LEGACY);

    expect(await run(fullGrants)).toBe(false);
  });

  it('resolves the alerts index from the engine data view', async () => {
    (getRiskInputsIndex as jest.Mock).mockResolvedValue({ index: '.alerts-security.alerts-other' });

    expect(await run({ ...fullGrants, '.alerts-security.alerts-other': ['read'] })).toBe(false);
    expect(getRiskInputsIndex).toHaveBeenCalledWith(
      expect.objectContaining({ dataViewId: 'data-view-id' })
    );
  });

  it('falls back to the default alerts index of the space without an engine configuration', async () => {
    (getConfiguration as jest.Mock).mockResolvedValue(null);

    expect(await run({ ...fullGrants, [ALERTS_INDEX]: ['read'] })).toBe(false);
    expect(getRiskInputsIndex).not.toHaveBeenCalled();
  });

  it('only checks the concrete names of a multi-pattern data view', async () => {
    (getRiskInputsIndex as jest.Mock).mockResolvedValue({
      index: `${ALERTS_INDEX},logs-*,-*elastic-cloud-logs-*`,
    });
    const security = buildSecurity(fullGrants);

    await checkEntityRiskScoreCalculationPrivileges({
      request,
      security,
      namespace: 'default',
      soClient,
      logger,
    });

    const check = (security.authz.checkPrivilegesDynamicallyWithRequest as jest.Mock).mock
      .results[0].value;
    expect(Object.keys(check.mock.calls[0][0].elasticsearch.index).sort()).toEqual(
      [ALERTS_INDEX, LOOKUP_INDEX, 'risk-score.risk-score-*'].sort()
    );
  });
});
