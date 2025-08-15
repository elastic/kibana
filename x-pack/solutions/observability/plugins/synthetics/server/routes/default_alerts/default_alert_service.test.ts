/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SanitizedRule } from '@kbn/alerting-types';
import { omit } from 'lodash';
import {
  SYNTHETICS_STATUS_RULE,
  SYNTHETICS_TLS_RULE,
} from '../../../common/constants/synthetics_alerts';
import { DefaultAlertService } from './default_alert_service';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../constants/settings';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SyntheticsServerSetup, UptimeRequestHandlerContext } from '../../types';

// Mock the LockManagerService
jest.mock('@kbn/lock-manager', () => ({
  LockManagerService: jest.fn().mockImplementation(() => ({
    withLock: jest.fn().mockImplementation((_lockId, callback) => callback()),
  })),
  LockAcquisitionError: class extends Error {},
}));

describe('DefaultAlertService', () => {
  // Ensure prototype spies don't leak across tests and override instance stubs/real implementations
  afterEach(() => {
    jest.restoreAllMocks();
  });
  // Alias with any-typed constructor so tests can call private methods via "any"
  type TestableCtor = new (
    context: UptimeRequestHandlerContext,
    server: SyntheticsServerSetup,
    soClient: SavedObjectsClientContract
  ) => any;
  const TestableDefaultAlertService = DefaultAlertService as unknown as TestableCtor;

  // Helper to create a service and spies for private methods without mutating the prototype permanently
  function createServiceWithMocks(
    context?: UptimeRequestHandlerContext,
    server?: SyntheticsServerSetup,
    soClient?: SavedObjectsClientContract
  ) {
    const service = new DefaultAlertService(
      (context ?? ({} as any)) as any,
      (server ?? ({} as any)) as any,
      (soClient ?? ({} as any)) as any
    );

    // Spy on the specific instance so mocks don't affect other tests
    const setupStatusRule = jest.spyOn(service as any, 'setupStatusRule');
    const setupTlsRule = jest.spyOn(service as any, 'setupTlsRule');
    const createDefaultRuleIfNotExist = jest.spyOn(service as any, 'createDefaultRuleIfNotExist');
    const updateStatusRule = jest.spyOn(service as any, 'updateStatusRule');
    const updateTlsRule = jest.spyOn(service as any, 'updateTlsRule');
    const upsertDefaultAlert = jest.spyOn(service as any, 'upsertDefaultAlert');

    return {
      service,
      mocks: {
        setupStatusRule,
        setupTlsRule,
        createDefaultRuleIfNotExist,
        updateStatusRule,
        updateTlsRule,
        upsertDefaultAlert,
      },
    };
  }
  describe('getSettings', () => {
    const expectedSettings = {
      certAgeThreshold: 50,
      certExpirationThreshold: 10,
      defaultConnectors: ['slack', 'email'],
    };
    const soResponse = { attributes: { ...expectedSettings } };

    it('returns settings if already set', async () => {
      const soClient = { get: jest.fn() } as any;
      const service = new DefaultAlertService({} as any, {} as any, soClient);
      service.settings = expectedSettings;
      // @ts-expect-error accessing protected method for testing
      const settings = await service.getSettings();
      expect(settings).toEqual(expectedSettings);
      expect(soClient.get).not.toHaveBeenCalled();
    });

    it('fetches settings if not set', async () => {
      const soClient = { get: jest.fn() } as any;
      const service = new DefaultAlertService({} as any, {} as any, soClient);
      soClient.get.mockResolvedValueOnce(soResponse);
      // @ts-expect-error accessing protected method for testing
      const settings = await service.getSettings();
      expect(settings).toEqual({
        ...expectedSettings,
        defaultEmail: undefined,
        defaultStatusRuleEnabled: true,
        defaultTLSRuleEnabled: true,
      });
      expect(soClient.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('setupDefaultAlerts', () => {
    afterEach(() => jest.resetAllMocks());

    it('sets up status and tls rules', async () => {
      const soClient = { get: jest.fn() } as any;
      const { service, mocks } = createServiceWithMocks();
      service.soClient = soClient;
      // avoid depending on LockManagerService implementation in this unit test
      (service as any).acquireLockOrFail = (cb: () => Promise<any>) => cb();
      // @ts-expect-error accessing protected method for testing
      service.getSettings = jest.fn().mockResolvedValue({
        certAgeThreshold: 50,
        certExpirationThreshold: 10,
        defaultConnectors: ['slack', 'email'],
        defaultEmail: undefined,
        defaultStatusRuleEnabled: true,
        defaultTLSRuleEnabled: true,
      });
      mocks.setupStatusRule.mockResolvedValue({ value: {} });
      mocks.setupTlsRule.mockResolvedValue({ value: {} });

      const result = await service.setupDefaultAlerts('default');
      expect(mocks.setupStatusRule).toHaveBeenCalledTimes(1);
      expect(mocks.setupTlsRule).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        statusRule: { value: {} },
        tlsRule: { value: {} },
      });
    });

    it('returns null rules if value is falsy', async () => {
      const soClient = { get: jest.fn() } as any;
      const { service, mocks } = createServiceWithMocks();
      service.soClient = soClient;
      // avoid depending on LockManagerService implementation in this unit test
      (service as any).acquireLockOrFail = (cb: () => Promise<any>) => cb();
      // @ts-expect-error accessing protected method for testing
      service.getSettings = jest.fn().mockResolvedValue({
        certAgeThreshold: 50,
        certExpirationThreshold: 10,
        defaultConnectors: ['slack', 'email'],
        defaultEmail: undefined,
        defaultStatusRuleEnabled: true,
        defaultTLSRuleEnabled: true,
      });
      mocks.setupStatusRule.mockResolvedValue(undefined);
      mocks.setupTlsRule.mockResolvedValue(undefined);

      const result = await service.setupDefaultAlerts('default');
      expect(mocks.setupStatusRule).toHaveBeenCalledTimes(1);
      expect(mocks.setupTlsRule).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        statusRule: null,
        tlsRule: null,
      });
    });
  });

  describe('getMinimumRuleInterval', () => {
    it('returns 1m if minimum interval is less than 1m', () => {
      const server = {
        alerting: { getConfig: () => ({ minimumScheduleInterval: { value: '30s' } }) },
      } as any;
      const service = new DefaultAlertService({} as any, server, {} as any);
      // @ts-expect-error accessing protected method for testing
      expect(service.getMinimumRuleInterval()).toBe('1m');
    });

    it('returns minimum interval if greater than 1m', () => {
      const server = {
        alerting: { getConfig: () => ({ minimumScheduleInterval: { value: '5m' } }) },
      } as any;
      const service = new DefaultAlertService({} as any, server, {} as any);
      // @ts-expect-error accessing protected method for testing
      expect(service.getMinimumRuleInterval()).toBe('5m');
    });
  });

  describe('setupStatusRule', () => {
    it('creates status rule if enabled', async () => {
      const service = new TestableDefaultAlertService({} as any, {} as any, {} as any);
      service.getMinimumRuleInterval = jest.fn().mockReturnValue('1m');
      // spy on instance method to observe calls
      const createSpy = jest
        .spyOn(service as any, 'createDefaultRuleIfNotExist')
        .mockResolvedValue(undefined as any);
      service.settings = { defaultStatusRuleEnabled: true } as any;

      await service.setupStatusRule('default');
      expect(createSpy).toHaveBeenCalledWith(
        SYNTHETICS_STATUS_RULE,
        'Synthetics status internal rule',
        '1m',
        'default'
      );
    });

    it('does not create status rule if disabled', async () => {
      const service = new TestableDefaultAlertService({} as any, {} as any, {} as any);
      service.getMinimumRuleInterval = jest.fn().mockReturnValue('1m');
      service.createDefaultRuleIfNotExist = jest.fn();
      service.settings = { defaultStatusRuleEnabled: false } as any;
      const result = await service.setupStatusRule('default');
      expect(service.createDefaultRuleIfNotExist).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('setupTlsRule', () => {
    it('creates tls rule if enabled', async () => {
      const service = new TestableDefaultAlertService({} as any, {} as any, {} as any);
      service.getMinimumRuleInterval = jest.fn().mockReturnValue('1m');
      const createSpy = jest
        .spyOn(service as any, 'createDefaultRuleIfNotExist')
        .mockResolvedValue(undefined as any);
      service.settings = { defaultTLSRuleEnabled: true } as any;

      await service.setupTlsRule('default');
      expect(createSpy).toHaveBeenCalledWith(
        SYNTHETICS_TLS_RULE,
        'Synthetics internal TLS rule',
        '1m',
        'default'
      );
    });
    it('does not create tls rule if disabled', async () => {
      const service = new TestableDefaultAlertService({} as any, {} as any, {} as any);
      service.getMinimumRuleInterval = jest.fn().mockReturnValue('1m');
      service.createDefaultRuleIfNotExist = jest.fn();
      service.settings = { defaultTLSRuleEnabled: false } as any;
      const result = await service.setupTlsRule('default');
      expect(service.createDefaultRuleIfNotExist).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('updateDefaultRules', () => {
    it('upserts both rules when enabled and returns their results', async () => {
      const service = new TestableDefaultAlertService({} as any, {} as any, {} as any);
      // pass-through the lock
      (service as any).acquireLockOrFail = (cb: () => Promise<any>) => cb();
      service.getMinimumRuleInterval = jest.fn().mockReturnValue('1m');
      service.upsertDefaultAlert = jest
        .fn()
        .mockResolvedValueOnce({ id: 'status', type: 'status' })
        .mockResolvedValueOnce({ id: 'tls', type: 'tls' });

      const result = await service.updateDefaultRules('default', true, true);

      expect(service.upsertDefaultAlert).toHaveBeenNthCalledWith(
        1,
        SYNTHETICS_STATUS_RULE,
        'Synthetics status internal rule',
        '1m',
        'default'
      );
      expect(service.upsertDefaultAlert).toHaveBeenNthCalledWith(
        2,
        SYNTHETICS_TLS_RULE,
        'Synthetics internal TLS rule',
        '1m',
        'default'
      );
      expect(result).toEqual([
        { id: 'status', type: 'status' },
        { id: 'tls', type: 'tls' },
      ]);
    });

    it('deletes rules when disabled', async () => {
      const bulkDeleteRules = jest.fn().mockResolvedValue(undefined);
      const getRulesClient = jest.fn().mockReturnValue({ bulkDeleteRules });
      const service = new TestableDefaultAlertService(
        { alerting: { getRulesClient } } as any,
        {} as any,
        {} as any
      );
      // pass-through the lock
      (service as any).acquireLockOrFail = (cb: () => Promise<any>) => cb();

      const result = await service.updateDefaultRules('default', false, false);

      expect(bulkDeleteRules).toHaveBeenCalledTimes(2);
      expect(bulkDeleteRules).toHaveBeenCalledWith({
        filter: `alert.attributes.alertTypeId:"${SYNTHETICS_STATUS_RULE}" AND alert.attributes.tags:"SYNTHETICS_DEFAULT_ALERT"`,
      });
      expect(bulkDeleteRules).toHaveBeenCalledWith({
        filter: `alert.attributes.alertTypeId:"${SYNTHETICS_TLS_RULE}" AND alert.attributes.tags:"SYNTHETICS_DEFAULT_ALERT"`,
      });
      expect(result).toEqual([undefined, undefined]);
    });
  });

  describe('existing alerts', () => {
    function setUpExistingRules<T extends Record<string, any>>(
      ruleOverride?: Partial<SanitizedRule<T>>,
      getRulesClientMocks = {}
    ) {
      const getRulesClient = jest.fn();
      const mockRule: any = ruleOverride ?? {
        actions: [{ alertsFilter: { query: { kql: 'some kql', filters: [] } } }],
        systemActions: [{ id: 'some system action', actionTypeId: 'actionTypeId', params: {} }],
        ruleTypeId: 'xpack.synthetics.alerts.monitorStatus',
        alertTypeId: 'xpack.synthetics.alerts.monitorStatus',
        id: '123',
      };
      const find = jest.fn();
      find.mockResolvedValue({
        data: [mockRule],
      });
      getRulesClient.mockReturnValue({ find, ...getRulesClientMocks });

      return { getRulesClient, mockRule };
    }

    function formatMockRuleResult(mockRule: any) {
      return {
        ...omit(mockRule, 'systemActions'),
        actions: [...mockRule.actions, ...mockRule.systemActions],
      };
    }

    afterEach(() => jest.resetAllMocks());

    describe('getExistingAlert', () => {
      it('returns rule if exists', async () => {
        const { getRulesClient, mockRule } = setUpExistingRules();
        const service = new TestableDefaultAlertService(
          { alerting: { getRulesClient } } as any,
          {} as any,
          {} as any
        );
        const result = await service.getExistingAlert('xpack.synthetics.alerts.monitorStatus');
        expect(result).toEqual(formatMockRuleResult(mockRule));
      });

      it('returns undefined if rule does not exist', async () => {
        const find = jest.fn().mockResolvedValue({ data: [] });
        const getRulesClient = jest.fn();
        getRulesClient.mockReturnValue({ find });
        const service = new TestableDefaultAlertService(
          { alerting: { getRulesClient } } as any,
          {} as any,
          {} as any
        );
        const result = await service.getExistingAlert('xpack.synthetics.alerts.monitorStatus');
        expect(result).toBeUndefined();
      });
    });

    describe('createDefaultAlertIfNotExist', () => {
      it('creates rule if does not exist', async () => {
        const sampleAction = { alertsFilter: { query: { kql: 'some kql', filters: [] } } };
        const create = jest.fn().mockResolvedValue({
          actions: [sampleAction],
          systemActions: [],
          id: '123',
          alertTypeId: 'testalertid',
        });
        const getActionsClient = jest.fn();
        getActionsClient.mockReturnValue({
          getAll: jest
            .fn()
            .mockResolvedValue([{ id: 'id', actionTypeId: 'actionTypeId', name: 'action name' }]),
        });
        const getRulesClient = jest.fn();
        getRulesClient.mockReturnValue({ create });
        const service = new TestableDefaultAlertService(
          { actions: { getActionsClient }, alerting: { getRulesClient } } as any,
          {} as any,
          {} as any
        );
        service.settings = { defaultConnectors: ['slack', 'email'] } as any;
        await service.createDefaultRuleIfNotExist(
          'xpack.synthetics.alerts.monitorStatus',
          'name',
          '1m',
          'default'
        );
        // assert create called with expected arguments
        expect(create).toHaveBeenCalledTimes(1);
        const callArg = create.mock.calls[0][0];
        expect(callArg).toMatchObject({
          data: {
            alertTypeId: 'xpack.synthetics.alerts.monitorStatus',
            name: 'name',
            schedule: { interval: '1m' },
            tags: ['SYNTHETICS_DEFAULT_ALERT'],
            consumer: 'uptime',
            enabled: true,
          },
          options: {
            id: 'SYNTHETICS_DEFAULT_ALERT-xpack.synthetics.alerts.monitorStatus-default',
          },
        });
      });
    });
  });

  describe('getActionConnectors', () => {
    it('fetches settings if not set', async () => {
      const getActionsClient = jest.fn();
      const getAll = jest.fn().mockResolvedValue([{ id: 'id', actionTypeId: 'actionTypeId' }]);
      getActionsClient.mockReturnValue({
        getAll,
      });
      const service = new TestableDefaultAlertService(
        { actions: { getActionsClient } } as any,
        {} as any,
        { get: jest.fn() } as any
      );
      const connectors = await service.getActionConnectors();
      expect(connectors).toEqual({
        actionConnectors: [{ id: 'id', actionTypeId: 'actionTypeId' }],
        settings: {
          ...DYNAMIC_SETTINGS_DEFAULTS,
          defaultStatusRuleEnabled: true,
          defaultTLSRuleEnabled: true,
        },
      });
      expect(getAll).toHaveBeenCalled();
    });
  });
});
