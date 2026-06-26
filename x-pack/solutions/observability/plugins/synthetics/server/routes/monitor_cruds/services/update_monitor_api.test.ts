/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConfigKey,
  FormMonitorType,
  MonitorTypeEnum,
  ScheduleUnit,
} from '../../../../common/runtime_types';
import { DEFAULT_FIELDS } from '../../../../common/constants/monitor_defaults';
import { UpdateMonitorAPI } from './update_monitor_api';

jest.mock('../../../synthetics_service/get_private_locations', () => ({
  getPrivateLocations: jest.fn().mockResolvedValue([]),
}));

jest.mock('../edit_monitor', () => ({
  validateLocationPermissions: jest
    .fn()
    .mockResolvedValue({ elasticManagedLocationsEnabled: true, canManagePrivateLocations: true }),
}));

jest.mock('../project_monitor/add_monitor_project', () => ({
  ELASTIC_MANAGED_LOCATIONS_DISABLED: 'Elastic managed locations are disabled',
}));

jest.mock('../monitor_locations_utils', () => ({
  assertCanUpdateMonitorInAllSpaces: jest.fn().mockResolvedValue(undefined),
  validateMonitorPrivateLocationSpaces: jest.fn().mockReturnValue(null),
}));

jest.mock('../monitor_validation', () => ({
  validateMonitor: jest.fn(),
  normalizeAPIConfig: jest.fn(),
}));

jest.mock('../../../synthetics_service/utils/secrets', () => ({
  /*
   * Pass-through mocks: tests assert structural changes (revision bump, hash
   * reset, AAD attribute carry-over) on the output of `formatSecrets`, so we
   * keep the input shape intact rather than wrap secrets into JSON. The real
   * functions are exercised in `edit_monitor_bulk.test.ts`.
   */
  formatSecrets: jest.fn((monitor: any) => ({ ...monitor })),
  normalizeSecrets: jest.fn((so: any) => ({ ...so, attributes: { ...so.attributes } })),
}));

jest.mock('../../common', () => ({
  getSavedObjectKqlFilter: jest.fn(() => 'mock-filter'),
}));

/**
 * Build the `{ updates: [{ id, attributes }] }` shape from an id list and a
 * single shared patch — keeps these tests (which mostly apply a uniform patch)
 * concise while exercising the per-item API contract.
 */
const updatesFor = (ids: string[], attributes: Record<string, unknown>) =>
  ids.map((id) => ({ id, attributes }));

const mockDecryptedMonitor = (overrides: Partial<Record<string, unknown>> = {}) => {
  const id = (overrides.id as string) ?? 'mon-1';
  const attributes: Record<string, unknown> = {
    id,
    type: 'http',
    name: 'My Monitor',
    enabled: true,
    locations: [{ id: 'us_central', isServiceManaged: true }],
    schedule: { number: '5', unit: 'm' },
    tags: ['tag-a'],
    [ConfigKey.MONITOR_SOURCE_TYPE]: 'ui',
    [ConfigKey.REVISION]: 3,
    [ConfigKey.CONFIG_HASH]: 'old-hash',
    secrets: '{}',
    ...(overrides.attributes as Record<string, unknown>),
  };
  return {
    id,
    type: 'synthetics-monitor-multi-space',
    references: [],
    score: 1,
    namespaces: ['default'],
    attributes,
  };
};

const mockValidationResultFor = (attributes: Record<string, unknown>) => ({
  valid: true,
  reason: '',
  details: '',
  payload: attributes,
  decodedMonitor: { ...attributes },
});

const createMockRouteContext = () => {
  const findDecryptedMonitors = jest.fn().mockResolvedValue([]);
  return {
    routeContext: {
      request: {} as any,
      response: { forbidden: jest.fn((opts: any) => opts) } as any,
      spaceId: 'default',
      server: { logger: { error: jest.fn() } } as any,
      savedObjectsClient: {} as any,
      monitorConfigRepository: { findDecryptedMonitors } as any,
    } as any,
    mocks: { findDecryptedMonitors },
  };
};

describe('UpdateMonitorAPI', () => {
  beforeEach(() => {
    /*
     * Clear call history first, then re-install default implementations.
     * Without `clearAllMocks` here, leftover calls from earlier tests leak
     * into `toHaveBeenCalledTimes` assertions in this file.
     */
    jest.clearAllMocks();

    const { validateMonitor, normalizeAPIConfig } = jest.requireMock('../monitor_validation');
    validateMonitor.mockImplementation((m: Record<string, unknown>) => mockValidationResultFor(m));
    // Default: no unsupported keys. Tests that care override this.
    normalizeAPIConfig.mockImplementation((m: Record<string, unknown>) => ({ formattedConfig: m }));

    const { validateLocationPermissions } = jest.requireMock('../edit_monitor');
    validateLocationPermissions.mockResolvedValue({
      elasticManagedLocationsEnabled: true,
      canManagePrivateLocations: true,
    });

    const { assertCanUpdateMonitorInAllSpaces, validateMonitorPrivateLocationSpaces } =
      jest.requireMock('../monitor_locations_utils');
    assertCanUpdateMonitorInAllSpaces.mockResolvedValue(undefined);
    validateMonitorPrivateLocationSpaces.mockReturnValue(null);

    const { getPrivateLocations } = jest.requireMock(
      '../../../synthetics_service/get_private_locations'
    );
    getPrivateLocations.mockResolvedValue([]);
  });

  describe('happy path', () => {
    it('produces a single survivor with bumped revision and reset hash', async () => {
      const { routeContext, mocks } = createMockRouteContext();
      mocks.findDecryptedMonitors.mockResolvedValue([mockDecryptedMonitor()]);

      const api = new UpdateMonitorAPI(routeContext);
      const result = await api.execute({ updates: updatesFor(['mon-1'], { enabled: false }) });

      expect(result.perIdErrors).toEqual({});
      expect(result.survivors).toHaveLength(1);
      const survivor = result.survivors[0];
      expect(survivor.decryptedPreviousMonitor.id).toBe('mon-1');
      expect(survivor.monitorWithRevision[ConfigKey.REVISION]).toBe(4);
      expect(survivor.monitorWithRevision[ConfigKey.CONFIG_HASH]).toBe('');
    });

    it('preserves AAD attributes not present in the patch (regression test)', async () => {
      /*
       * This is the headline guarantee of this endpoint: a partial patch must
       * not strip AAD-bound attributes from the encrypted SO. If
       * `mergeSourceMonitor` ever stops carrying over previous fields, the
       * decrypt-merge-encrypt cycle will produce a monitor that fails to
       * decrypt on next read. Test asserts every previous AAD attribute we
       * did not patch is still present in the survivor's monitorWithRevision.
       */
      const { routeContext, mocks } = createMockRouteContext();
      mocks.findDecryptedMonitors.mockResolvedValue([mockDecryptedMonitor()]);

      const api = new UpdateMonitorAPI(routeContext);
      const result = await api.execute({ updates: updatesFor(['mon-1'], { enabled: false }) });

      const attrs = result.survivors[0].monitorWithRevision as Record<string, unknown>;
      expect(attrs.name).toBe('My Monitor');
      expect(attrs.tags).toEqual(['tag-a']);
      expect(attrs.schedule).toEqual({ number: '5', unit: 'm' });
      expect(attrs.locations).toEqual([{ id: 'us_central', isServiceManaged: true }]);
      expect(attrs.enabled).toBe(false);
    });

    it('processes multiple monitors with a single decrypt round-trip', async () => {
      const { routeContext, mocks } = createMockRouteContext();
      mocks.findDecryptedMonitors.mockResolvedValue([
        mockDecryptedMonitor({ id: 'mon-1' }),
        mockDecryptedMonitor({ id: 'mon-2' }),
      ]);

      const api = new UpdateMonitorAPI(routeContext);
      const result = await api.execute({
        updates: updatesFor(['mon-1', 'mon-2'], { enabled: false }),
      });

      expect(mocks.findDecryptedMonitors).toHaveBeenCalledTimes(1);
      expect(result.survivors).toHaveLength(2);
      expect(result.survivors.map((s) => s.decryptedPreviousMonitor.id).sort()).toEqual([
        'mon-1',
        'mon-2',
      ]);
    });
  });

  describe('not_found', () => {
    it('records every requested id missing from the result set', async () => {
      const { routeContext, mocks } = createMockRouteContext();
      mocks.findDecryptedMonitors.mockResolvedValue([mockDecryptedMonitor({ id: 'mon-1' })]);

      const api = new UpdateMonitorAPI(routeContext);
      const result = await api.execute({
        updates: updatesFor(['mon-1', 'missing-1', 'missing-2'], { enabled: false }),
      });

      expect(result.survivors).toHaveLength(1);
      expect(result.perIdErrors['missing-1'].code).toBe('not_found');
      expect(result.perIdErrors['missing-2'].code).toBe('not_found');
      expect(result.perIdErrors['missing-1'].message).toContain('missing-1');
    });
  });

  describe('invalid_origin', () => {
    it.each(['project', 'agent'])('rejects origin %s', async (origin) => {
      const { routeContext, mocks } = createMockRouteContext();
      mocks.findDecryptedMonitors.mockResolvedValue([
        mockDecryptedMonitor({ attributes: { [ConfigKey.MONITOR_SOURCE_TYPE]: origin } }),
      ]);

      const api = new UpdateMonitorAPI(routeContext);
      const result = await api.execute({ updates: updatesFor(['mon-1'], { enabled: false }) });

      expect(result.survivors).toHaveLength(0);
      expect(result.perIdErrors['mon-1'].code).toBe('invalid_origin');
      expect(result.perIdErrors['mon-1'].message).toContain(origin);
    });

    it('does not call validateMonitor for rejected origins (short-circuit)', async () => {
      const { validateMonitor } = jest.requireMock('../monitor_validation');
      const { routeContext, mocks } = createMockRouteContext();
      mocks.findDecryptedMonitors.mockResolvedValue([
        mockDecryptedMonitor({ attributes: { [ConfigKey.MONITOR_SOURCE_TYPE]: 'project' } }),
      ]);

      const api = new UpdateMonitorAPI(routeContext);
      await api.execute({ updates: updatesFor(['mon-1'], { enabled: false }) });

      expect(validateMonitor).not.toHaveBeenCalled();
    });
  });

  describe('validation_failed', () => {
    it('records the io-ts failure reason and details', async () => {
      const { validateMonitor } = jest.requireMock('../monitor_validation');
      validateMonitor.mockReturnValue({
        valid: false,
        reason: 'Monitor schedule is invalid',
        details: 'Invalid schedule 7 minutes...',
        payload: {},
      });

      const { routeContext, mocks } = createMockRouteContext();
      mocks.findDecryptedMonitors.mockResolvedValue([mockDecryptedMonitor()]);

      const api = new UpdateMonitorAPI(routeContext);
      const result = await api.execute({
        updates: updatesFor(['mon-1'], {
          schedule: { number: '7', unit: ScheduleUnit.MINUTES },
        }),
      });

      expect(result.survivors).toHaveLength(0);
      expect(result.perIdErrors['mon-1']).toEqual({
        code: 'validation_failed',
        message: 'Monitor schedule is invalid',
        details: 'Invalid schedule 7 minutes...',
      });
    });
  });

  describe('forbidden', () => {
    it('records elastic-managed-locations permission failures', async () => {
      const { validateLocationPermissions } = jest.requireMock('../edit_monitor');
      validateLocationPermissions.mockResolvedValue({ elasticManagedLocationsEnabled: false });

      const { routeContext, mocks } = createMockRouteContext();
      mocks.findDecryptedMonitors.mockResolvedValue([mockDecryptedMonitor()]);

      const api = new UpdateMonitorAPI(routeContext);
      const result = await api.execute({ updates: updatesFor(['mon-1'], { enabled: false }) });

      expect(result.survivors).toHaveLength(0);
      expect(result.perIdErrors['mon-1']).toEqual({
        code: 'forbidden',
        message: 'Elastic managed locations are disabled',
      });
    });

    it('records multi-space privilege failures (without leaking the response object)', async () => {
      const { assertCanUpdateMonitorInAllSpaces } = jest.requireMock('../monitor_locations_utils');
      assertCanUpdateMonitorInAllSpaces.mockResolvedValue({ status: 403 });

      const { routeContext, mocks } = createMockRouteContext();
      mocks.findDecryptedMonitors.mockResolvedValue([
        mockDecryptedMonitor({
          attributes: { [ConfigKey.KIBANA_SPACES]: ['default', 'other-space'] },
        }),
      ]);

      const api = new UpdateMonitorAPI(routeContext);
      const result = await api.execute({ updates: updatesFor(['mon-1'], { enabled: false }) });

      expect(result.survivors).toHaveLength(0);
      expect(result.perIdErrors['mon-1'].code).toBe('forbidden');
      expect(result.perIdErrors['mon-1'].message).not.toMatch(/\[object Object\]/);
    });

    it('records private-location-space coverage failures', async () => {
      const { getPrivateLocations } = jest.requireMock(
        '../../../synthetics_service/get_private_locations'
      );
      getPrivateLocations.mockResolvedValue([{ id: 'pl-1', label: 'PL', spaces: ['default'] }]);

      const { validateMonitorPrivateLocationSpaces } = jest.requireMock(
        '../monitor_locations_utils'
      );
      validateMonitorPrivateLocationSpaces.mockReturnValue({
        message: 'PL is not available in space "team-b"',
        attributes: { errors: [] },
      });

      const { routeContext, mocks } = createMockRouteContext();
      mocks.findDecryptedMonitors.mockResolvedValue([
        mockDecryptedMonitor({
          attributes: { locations: [{ id: 'pl-1', isServiceManaged: false }] },
        }),
      ]);

      const api = new UpdateMonitorAPI(routeContext);
      /*
       * Patch must touch `locations` or `spaces` to trigger the
       * private-locations fetch — see `maybeLoadPrivateLocations`.
       */
      const result = await api.execute({
        updates: updatesFor(['mon-1'], { [ConfigKey.KIBANA_SPACES]: ['default', 'team-b'] }),
      });

      expect(result.survivors).toHaveLength(0);
      expect(result.perIdErrors['mon-1']).toEqual({
        code: 'forbidden',
        message: 'PL is not available in space "team-b"',
      });
    });
  });

  describe('mixed batch', () => {
    it('routes each id to the correct slot and lets survivors through', async () => {
      const { validateMonitor } = jest.requireMock('../monitor_validation');
      validateMonitor.mockImplementation((m: Record<string, unknown>) => {
        if ((m.id as string) === 'mon-bad') {
          return { valid: false, reason: 'bad', details: 'bad', payload: m };
        }
        return mockValidationResultFor(m);
      });

      const { routeContext, mocks } = createMockRouteContext();
      mocks.findDecryptedMonitors.mockResolvedValue([
        mockDecryptedMonitor({ id: 'mon-ok' }),
        mockDecryptedMonitor({
          id: 'mon-project',
          attributes: { [ConfigKey.MONITOR_SOURCE_TYPE]: 'project' },
        }),
        mockDecryptedMonitor({ id: 'mon-bad' }),
      ]);

      const api = new UpdateMonitorAPI(routeContext);
      const result = await api.execute({
        updates: updatesFor(['mon-ok', 'mon-project', 'mon-bad', 'mon-missing'], {
          enabled: false,
        }),
      });

      expect(result.survivors).toHaveLength(1);
      expect(result.survivors[0].decryptedPreviousMonitor.id).toBe('mon-ok');
      expect(result.perIdErrors['mon-project'].code).toBe('invalid_origin');
      expect(result.perIdErrors['mon-bad'].code).toBe('validation_failed');
      expect(result.perIdErrors['mon-missing'].code).toBe('not_found');
    });
  });

  describe('permission checks resolve once per request', () => {
    it('resolves the elastic-managed-locations capability once for N public-location monitors', async () => {
      const { validateLocationPermissions } = jest.requireMock('../edit_monitor');

      const { routeContext, mocks } = createMockRouteContext();
      mocks.findDecryptedMonitors.mockResolvedValue([
        mockDecryptedMonitor({ id: 'mon-1' }),
        mockDecryptedMonitor({ id: 'mon-2' }),
        mockDecryptedMonitor({ id: 'mon-3' }),
      ]);

      const api = new UpdateMonitorAPI(routeContext);
      const result = await api.execute({
        updates: updatesFor(['mon-1', 'mon-2', 'mon-3'], { enabled: false }),
      });

      expect(result.survivors).toHaveLength(3);
      expect(validateLocationPermissions).toHaveBeenCalledTimes(1);
    });

    it('skips the location-capability check when no monitor has a public location', async () => {
      const { validateLocationPermissions } = jest.requireMock('../edit_monitor');

      const { routeContext, mocks } = createMockRouteContext();
      mocks.findDecryptedMonitors.mockResolvedValue([
        mockDecryptedMonitor({
          id: 'mon-1',
          attributes: { locations: [{ id: 'pl-1', isServiceManaged: false }] },
        }),
      ]);

      const api = new UpdateMonitorAPI(routeContext);
      await api.execute({ updates: updatesFor(['mon-1'], { enabled: false }) });

      expect(validateLocationPermissions).not.toHaveBeenCalled();
    });

    it('checks bulk_update space privileges once per unique space set', async () => {
      const { assertCanUpdateMonitorInAllSpaces } = jest.requireMock('../monitor_locations_utils');

      const { routeContext, mocks } = createMockRouteContext();
      mocks.findDecryptedMonitors.mockResolvedValue([
        mockDecryptedMonitor({
          id: 'mon-1',
          attributes: { [ConfigKey.KIBANA_SPACES]: ['default', 'team-b'] },
        }),
        mockDecryptedMonitor({
          id: 'mon-2',
          // same set, different order -> same cache key, no extra call
          attributes: { [ConfigKey.KIBANA_SPACES]: ['team-b', 'default'] },
        }),
        mockDecryptedMonitor({
          id: 'mon-3',
          attributes: { [ConfigKey.KIBANA_SPACES]: ['default', 'team-c'] },
        }),
      ]);

      const api = new UpdateMonitorAPI(routeContext);
      const result = await api.execute({
        updates: updatesFor(['mon-1', 'mon-2', 'mon-3'], { enabled: false }),
      });

      expect(result.survivors).toHaveLength(3);
      // two distinct space sets -> two privilege checks, not three
      expect(assertCanUpdateMonitorInAllSpaces).toHaveBeenCalledTimes(2);
    });
  });

  describe('private locations fetch', () => {
    it('skips the SO read when the patch does not touch locations or spaces', async () => {
      const { getPrivateLocations } = jest.requireMock(
        '../../../synthetics_service/get_private_locations'
      );

      const { routeContext, mocks } = createMockRouteContext();
      mocks.findDecryptedMonitors.mockResolvedValue([mockDecryptedMonitor()]);

      const api = new UpdateMonitorAPI(routeContext);
      await api.execute({ updates: updatesFor(['mon-1'], { enabled: false, tags: ['x'] }) });

      expect(getPrivateLocations).not.toHaveBeenCalled();
    });

    it('fetches once per execute when the patch touches locations', async () => {
      const { getPrivateLocations } = jest.requireMock(
        '../../../synthetics_service/get_private_locations'
      );

      const { routeContext, mocks } = createMockRouteContext();
      mocks.findDecryptedMonitors.mockResolvedValue([
        mockDecryptedMonitor({ id: 'mon-1' }),
        mockDecryptedMonitor({ id: 'mon-2' }),
      ]);

      const api = new UpdateMonitorAPI(routeContext);
      await api.execute({
        updates: updatesFor(['mon-1', 'mon-2'], {
          locations: [{ id: 'us_central', label: 'US Central', isServiceManaged: true }],
        }),
      });

      expect(getPrivateLocations).toHaveBeenCalledTimes(1);
    });
  });

  describe('per-id patches', () => {
    it('applies a different patch to each id', async () => {
      const { routeContext, mocks } = createMockRouteContext();
      mocks.findDecryptedMonitors.mockResolvedValue([
        mockDecryptedMonitor({ id: 'mon-1' }),
        mockDecryptedMonitor({ id: 'mon-2' }),
      ]);

      const api = new UpdateMonitorAPI(routeContext);
      const result = await api.execute({
        updates: [
          { id: 'mon-1', attributes: { enabled: false } },
          { id: 'mon-2', attributes: { tags: ['only-mon-2'] } },
        ],
      });

      expect(result.survivors).toHaveLength(2);
      const byId = (id: string) =>
        result.survivors.find((s) => s.decryptedPreviousMonitor.id === id)!
          .monitorWithRevision as Record<string, unknown>;
      // mon-1 got enabled:false but kept its original tags
      expect(byId('mon-1').enabled).toBe(false);
      expect(byId('mon-1').tags).toEqual(['tag-a']);
      // mon-2 got new tags but kept enabled:true
      expect(byId('mon-2').tags).toEqual(['only-mon-2']);
      expect(byId('mon-2').enabled).toBe(true);
    });
  });

  describe('empty input', () => {
    it('returns empty result for empty updates without calling SO client', async () => {
      const { routeContext, mocks } = createMockRouteContext();
      mocks.findDecryptedMonitors.mockResolvedValue([]);

      const api = new UpdateMonitorAPI(routeContext);
      const result = await api.execute({ updates: [] });

      expect(result.survivors).toEqual([]);
      expect(result.perIdErrors).toEqual({});
    });
  });

  /*
   * Other tests stub `validateMonitor` / `normalizeAPIConfig`. Here we run the
   * REAL merge + unsupported-key + io-ts validation gate end-to-end to prove
   * the bulk path enforces it: the patch is applied to a full valid monitor,
   * and the *merged* result is validated.
   */
  describe('real validation gate (end-to-end)', () => {
    beforeEach(() => {
      const { validateMonitor, normalizeAPIConfig } = jest.requireMock('../monitor_validation');
      const { validateMonitor: realValidateMonitor, normalizeAPIConfig: realNormalizeAPIConfig } =
        jest.requireActual('../monitor_validation');
      validateMonitor.mockImplementation(realValidateMonitor);
      normalizeAPIConfig.mockImplementation(realNormalizeAPIConfig);
    });

    /*
     * Built from DEFAULT_FIELDS so every key is a supported monitor field (no
     * `secrets`/foreign keys) — i.e. the shape `normalizeSecrets` yields in
     * production, which `normalizeAPIConfig` accepts without flagging.
     */
    const validHttpMonitor = (id = 'mon-1') => ({
      id,
      type: 'synthetics-monitor-multi-space',
      references: [],
      score: 1,
      namespaces: ['default'],
      attributes: {
        ...DEFAULT_FIELDS[MonitorTypeEnum.HTTP],
        [ConfigKey.CONFIG_ID]: id,
        [ConfigKey.NAME]: 'Valid HTTP',
        [ConfigKey.URLS]: 'https://example.com',
        [ConfigKey.SCHEDULE]: { number: '5', unit: ScheduleUnit.MINUTES },
        [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.HTTP,
        [ConfigKey.LOCATIONS]: [
          {
            id: 'us_central',
            label: 'US Central',
            isServiceManaged: true,
            geo: { lat: 0, lon: 0 },
          },
        ],
        [ConfigKey.MONITOR_SOURCE_TYPE]: 'ui',
      },
    });

    it('lets a valid partial patch through', async () => {
      const { routeContext, mocks } = createMockRouteContext();
      mocks.findDecryptedMonitors.mockResolvedValue([validHttpMonitor()]);

      const api = new UpdateMonitorAPI(routeContext);
      const result = await api.execute({ updates: updatesFor(['mon-1'], { enabled: false }) });

      expect(result.perIdErrors).toEqual({});
      expect(result.survivors).toHaveLength(1);
      expect((result.survivors[0].monitorWithRevision as Record<string, unknown>).enabled).toBe(
        false
      );
    });

    it('rejects a patch with an out-of-range value on a known field', async () => {
      const { routeContext, mocks } = createMockRouteContext();
      mocks.findDecryptedMonitors.mockResolvedValue([validHttpMonitor()]);

      const api = new UpdateMonitorAPI(routeContext);
      const result = await api.execute({
        updates: updatesFor(['mon-1'], { schedule: { number: '4', unit: ScheduleUnit.MINUTES } }),
      });

      expect(result.survivors).toHaveLength(0);
      expect(result.perIdErrors['mon-1'].code).toBe('validation_failed');
    });

    it('rejects a patch that introduces an unknown/unsupported field', async () => {
      const { routeContext, mocks } = createMockRouteContext();
      mocks.findDecryptedMonitors.mockResolvedValue([validHttpMonitor()]);

      const api = new UpdateMonitorAPI(routeContext);
      const result = await api.execute({
        updates: [{ id: 'mon-1', attributes: { enabled: false, notARealField: 'x' } as never }],
      });

      expect(result.survivors).toHaveLength(0);
      expect(result.perIdErrors['mon-1'].code).toBe('validation_failed');
      expect(result.perIdErrors['mon-1'].message).toMatch(/Invalid monitor key/i);
    });
  });
});
