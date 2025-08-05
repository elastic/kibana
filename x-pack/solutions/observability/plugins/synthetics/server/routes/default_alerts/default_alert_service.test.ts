/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SanitizedRule } from '@kbn/alerting-types';
import { omit } from 'lodash';
import {
  SYNTHETICS_STATUS_RULE,
  SYNTHETICS_TLS_RULE,
} from '../../../common/constants/synthetics_alerts';
import { DefaultAlertService } from './default_alert_service';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../constants/settings';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SyntheticsServerSetup, UptimeRequestHandlerContext } from '../../types';
import { DefaultRuleType } from '../../../common/types/default_alerts';

// Mock the LockManagerService
jest.mock('@kbn/lock-manager', () => ({
  LockManagerService: jest.fn().mockImplementation(() => ({
    withLock: jest.fn().mockImplementation((_lockId, callback) => callback()),
  })),
  LockAcquisitionError: class extends Error {},
}));

describe('DefaultAlertService', () => {
  // Helper function to create a service instance with mocked private methods
  function createTestableService(
    context?: UptimeRequestHandlerContext,
    server?: SyntheticsServerSetup,
    soClient?: SavedObjectsClientContract
  ) {
    const service = new DefaultAlertService(
      context || ({} as any),
      server || ({} as any),
      soClient || ({} as any)
    );

    // Mock private methods by accessing them through the prototype
    const originalSetupStatusRule = (DefaultAlertService.prototype as any).setupStatusRule;
    const originalSetupTlsRule = (DefaultAlertService.prototype as any).setupTlsRule;
    const originalCreateDefaultRuleIfNotExist = (DefaultAlertService.prototype as any).createDefaultRuleIfNotExist;
    const originalUpdateStatusRule = (DefaultAlertService.prototype as any).updateStatusRule;
    const originalUpdateTlsRule = (DefaultAlertService.prototype as any).updateTlsRule;
    const originalUpsertDefaultAlert = (DefaultAlertService.prototype as any).upsertDefaultAlert;

    // Create jest spies that can be used to mock the methods
    const setupStatusRule = jest.fn();
    const setupTlsRule = jest.fn();
    const createDefaultRuleIfNotExist = jest.fn();
    const updateStatusRule = jest.fn();
    const updateTlsRule = jest.fn();
    const upsertDefaultAlert = jest.fn();

    // Replace the methods on the prototype temporarily for this instance
    (DefaultAlertService.prototype as any).setupStatusRule = setupStatusRule;
    (DefaultAlertService.prototype as any).setupTlsRule = setupTlsRule;
    (DefaultAlertService.prototype as any).createDefaultRuleIfNotExist = createDefaultRuleIfNotExist;
    (DefaultAlertService.prototype as any).updateStatusRule = updateStatusRule;
    (DefaultAlertService.prototype as any).updateTlsRule = updateTlsRule;
    (DefaultAlertService.prototype as any).upsertDefaultAlert = upsertDefaultAlert;

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
      // Cleanup function to restore original methods
      cleanup: () => {
        (DefaultAlertService.prototype as any).setupStatusRule = originalSetupStatusRule;
        (DefaultAlertService.prototype as any).setupTlsRule = originalSetupTlsRule;
        (DefaultAlertService.prototype as any).createDefaultRuleIfNotExist = originalCreateDefaultRuleIfNotExist;
        (DefaultAlertService.prototype as any).updateStatusRule = originalUpdateStatusRule;
        (DefaultAlertService.prototype as any).updateTlsRule = originalUpdateTlsRule;
        (DefaultAlertService.prototype as any).upsertDefaultAlert = originalUpsertDefaultAlert;
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
      service.createDefaultRuleIfNotExist = jest.fn();
      service.settings = { defaultStatusRuleEnabled: true } as any;

      await service.setupStatusRule('default');
      expect(service.createDefaultRuleIfNotExist).toHaveBeenCalledWith(
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
      service.createDefaultRuleIfNotExist = jest.fn();
      service.settings = { defaultTLSRuleEnabled: true } as any;

      await service.setupTlsRule('default');
      expect(service.createDefaultRuleIfNotExist).toHaveBeenCalledWith(
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
        const result = await service.createDefaultRuleIfNotExist(
          'xpack.synthetics.alerts.monitorStatus',
          'name',
          '1m',
          'default'
        );
        expect(result).toEqual({
          actions: [sampleAction],
          id: '123',
          alertTypeId: 'testalertid',
          ruleTypeId: 'testalertid',
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
