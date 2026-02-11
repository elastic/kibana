/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Subject } from 'rxjs';
import type { ILicense } from '@kbn/licensing-types';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { cloudMock } from '@kbn/cloud-plugin/server/mocks';
import { ALL_PRODUCT_FEATURE_KEYS } from '@kbn/security-solution-features/keys';
import { LicenseService } from '../../../common/license';
import { createDefaultPolicy } from './create_default_policy';
import { ProtectionModes } from '../../../common/endpoint/types';
import type { PolicyConfig } from '../../../common/endpoint/types';
import { policyFactory } from '../../../common/endpoint/models/policy_config';
import * as PolicyConfigHelpers from '../../../common/endpoint/models/policy_config_helpers';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type {
  AnyPolicyCreateConfig,
  PolicyCreateCloudConfig,
  PolicyCreateEndpointConfig,
} from '../types';
import type { ProductFeaturesService } from '../../lib/product_features_service/product_features_service';
import { createProductFeaturesServiceMock } from '../../lib/product_features_service/mocks';
import { createTelemetryConfigProviderMock } from '../../../common/telemetry_config/mocks';
import type { ExperimentalFeatures } from '../../../common';

describe('Create Default Policy tests ', () => {
  const cloud = cloudMock.createSetup();
  const Platinum = licenseMock.createLicense({
    license: { type: 'platinum', mode: 'platinum', uid: '' },
  });
  const Gold = licenseMock.createLicense({ license: { type: 'gold', mode: 'gold', uid: '' } });
  let licenseEmitter: Subject<ILicense>;
  let licenseService: LicenseService;
  let productFeaturesService: ProductFeaturesService;
  const telemetryConfigProviderMock = createTelemetryConfigProviderMock();
  const experimentalFeatures = {
    trustedDevices: true,
  } as ExperimentalFeatures;

  const createDefaultPolicyCallback = async (
    config?: AnyPolicyCreateConfig
  ): Promise<PolicyConfig> => {
    const esClientInfo = await elasticsearchServiceMock.createClusterClient().asInternalUser.info();
    esClientInfo.cluster_name = '';
    esClientInfo.cluster_uuid = '';
    return createDefaultPolicy(
      licenseService,
      config,
      cloud,
      esClientInfo,
      productFeaturesService,
      telemetryConfigProviderMock,
      experimentalFeatures
    );
  };

  beforeEach(() => {
    licenseEmitter = new Subject();
    licenseService = new LicenseService();
    licenseService.start(licenseEmitter);
    licenseEmitter.next(Platinum); // set license level to platinum
    productFeaturesService = createProductFeaturesServiceMock();
  });

  describe('When no config is set', () => {
    beforeEach(() => {
      // @ts-expect-error write to readonly property for testing
      experimentalFeatures.linuxDnsEvents = true;
    });

    it('Should return PolicyConfig when license is at least platinum', async () => {
      const defaultPolicy = policyFactory();

      const policy = await createDefaultPolicyCallback(undefined);

      // events are the same
      expect(policy.windows.events).toEqual(defaultPolicy.windows.events);
      expect(policy.linux.events).toEqual(defaultPolicy.linux.events);
      expect(policy.mac.events).toEqual(defaultPolicy.mac.events);

      // check some of the protections to be disabled
      const disabledButSupported = { mode: ProtectionModes.off, supported: true };
      const disabledButSupportedBehaviorProtection = {
        mode: ProtectionModes.off,
        supported: true,
        reputation_service: true,
      };
      expect(policy.windows.behavior_protection).toEqual(disabledButSupportedBehaviorProtection);
      expect(policy.mac.memory_protection).toEqual(disabledButSupported);
      expect(policy.linux.behavior_protection).toEqual(disabledButSupportedBehaviorProtection);

      // malware popups should be disabled
      expect(policy.windows.popup.malware.enabled).toBeFalsy();
      expect(policy.mac.popup.malware.enabled).toBeFalsy();
      expect(policy.linux.popup.malware.enabled).toBeFalsy();
    });

    it('Should return PolicyConfig for events only without paid features when license is below platinum', async () => {
      const defaultPolicy = policyFactory();
      licenseEmitter.next(Gold);

      const policy = await createDefaultPolicyCallback(undefined);

      // events are the same
      expect(policy.windows.events).toEqual(defaultPolicy.windows.events);
      expect(policy.linux.events).toEqual(defaultPolicy.linux.events);
      expect(policy.mac.events).toEqual(defaultPolicy.mac.events);

      // check some of the protections to be disabled and unsupported
      const disabledAndUnsupported = { mode: ProtectionModes.off, supported: false };
      const disabledAndUnsupportedBehaviorProtection = {
        mode: ProtectionModes.off,
        supported: false,
        reputation_service: false,
      };
      expect(policy.windows.behavior_protection).toEqual(disabledAndUnsupportedBehaviorProtection);
      expect(policy.mac.memory_protection).toEqual(disabledAndUnsupported);
      expect(policy.linux.behavior_protection).toEqual(disabledAndUnsupportedBehaviorProtection);

      // malware popups are enabled on unpaid license
      expect(policy.windows.popup.malware.enabled).toBeTruthy();
      expect(policy.mac.popup.malware.enabled).toBeTruthy();
      expect(policy.linux.popup.malware.enabled).toBeTruthy();
    });
  });

  describe('When endpoint config is set', () => {
    const createEndpointConfig = (
      endpointConfig: PolicyCreateEndpointConfig['endpointConfig']
    ): PolicyCreateEndpointConfig => {
      return {
        type: 'endpoint',
        endpointConfig,
      };
    };

    const defaultEventsDisabled = (): {
      linux: PolicyConfig['linux']['events'];
      mac: PolicyConfig['mac']['events'];
      windows: PolicyConfig['windows']['events'];
    } => ({
      linux: {
        dns: false,
        file: false,
        process: false,
        network: false,
        session_data: false,
        tty_io: false,
      },
      mac: {
        dns: false,
        process: false,
        file: false,
        network: false,
        security: false,
      },
      windows: {
        credential_access: false,
        process: false,
        file: false,
        network: false,
        dll_and_driver_load: false,
        dns: false,
        registry: false,
        security: false,
      },
    });
    const OSTypes = ['linux', 'mac', 'windows'] as const;

    beforeEach(() => {
      // @ts-expect-error write to readonly property for testing
      experimentalFeatures.linuxDnsEvents = true;
    });

    it('Should return PolicyConfig for events only when preset is DataCollection', async () => {
      const defaultPolicy = policyFactory();
      const config = createEndpointConfig({ preset: 'DataCollection' });
      const policy = await createDefaultPolicyCallback(config);

      // events are the same
      expect(policy.windows.events).toEqual(defaultPolicy.windows.events);
      expect(policy.linux.events).toEqual(defaultPolicy.linux.events);
      expect(policy.mac.events).toEqual(defaultPolicy.mac.events);

      // check some of the protections to be disabled
      const disabledButSupported = { mode: ProtectionModes.off, supported: true };
      const disabledButSupportedBehaviorProtection = {
        mode: ProtectionModes.off,
        supported: true,
        reputation_service: true,
      };
      expect(policy.windows.behavior_protection).toEqual(disabledButSupportedBehaviorProtection);
      expect(policy.mac.memory_protection).toEqual(disabledButSupported);
      expect(policy.linux.behavior_protection).toEqual(disabledButSupportedBehaviorProtection);

      // malware popups should be disabled
      expect(policy.windows.popup.malware.enabled).toBeFalsy();
      expect(policy.mac.popup.malware.enabled).toBeFalsy();
      expect(policy.linux.popup.malware.enabled).toBeFalsy();
    });

    it('Should return only process event enabled on policy when preset is NGAV', async () => {
      const config = createEndpointConfig({ preset: 'NGAV' });
      const policy = await createDefaultPolicyCallback(config);
      const events = defaultEventsDisabled();
      OSTypes.forEach((os) => {
        expect(policy[os].events).toMatchObject({
          ...events[os],
          process: true,
        });
      });
    });

    it('Should return process, file and network events enabled when preset is EDR Essential', async () => {
      const config = createEndpointConfig({ preset: 'EDREssential' });
      const policy = await createDefaultPolicyCallback(config);
      const events = defaultEventsDisabled();
      const enabledEvents = {
        process: true,
        file: true,
        network: true,
      };
      OSTypes.forEach((os) => {
        expect(policy[os].events).toMatchObject({
          ...events[os],
          ...enabledEvents,
        });
      });
    });

    it('Should return the default config when preset is EDR Complete', async () => {
      const config = createEndpointConfig({ preset: 'EDRComplete' });
      const policy = await createDefaultPolicyCallback(config);
      const license = 'platinum';
      const isCloud = true;
      const defaultPolicy = policyFactory({
        license,
        cloud: isCloud,
        isGlobalTelemetryEnabled: true,
      });
      // update defaultPolicy w/ platinum license & cloud info
      defaultPolicy.meta.license = license;
      defaultPolicy.meta.cloud = isCloud;
      expect(policy).toMatchObject(defaultPolicy);
    });

    it('should set policy to event collection only if endpointPolicyProtections productFeature is disabled', async () => {
      productFeaturesService = createProductFeaturesServiceMock(
        ALL_PRODUCT_FEATURE_KEYS.filter((key) => key !== 'endpoint_policy_protections')
      );

      await expect(
        createDefaultPolicyCallback(createEndpointConfig({ preset: 'EDRComplete' }))
      ).resolves.toMatchObject({
        linux: {
          behavior_protection: { mode: 'off' },
          malware: { mode: 'off' },
          memory_protection: { mode: 'off' },
        },
        mac: {
          behavior_protection: { mode: 'off' },
          malware: { mode: 'off' },
          memory_protection: { mode: 'off' },
        },
        windows: {
          antivirus_registration: { enabled: false },
          attack_surface_reduction: { credential_hardening: { enabled: false } },
          behavior_protection: { mode: 'off' },
          malware: { blocklist: false },
          memory_protection: { mode: 'off' },
          ransomware: { mode: 'off' },
        },
      });
    });

    it('should set meta.billable', async () => {
      const isBillablePolicySpy = jest.spyOn(PolicyConfigHelpers, 'isBillablePolicy');
      const config = createEndpointConfig({ preset: 'DataCollection' });

      isBillablePolicySpy.mockReturnValue(false);
      let policy = await createDefaultPolicyCallback(config);
      expect(policy.meta.billable).toBe(false);

      isBillablePolicySpy.mockReturnValue(true);
      policy = await createDefaultPolicyCallback(config);
      expect(policy.meta.billable).toBe(true);

      isBillablePolicySpy.mockRestore();
    });
  });

  describe('When cloud config is set', () => {
    const createCloudConfig = (): PolicyCreateCloudConfig => ({
      type: 'cloud',
    });

    it('Session data should be enabled for Linux', async () => {
      const config = createCloudConfig();
      const policy = await createDefaultPolicyCallback(config);
      expect(policy.linux.events.session_data).toBe(true);
    });
    it('Protections should be disabled for all OSs', async () => {
      const config = createCloudConfig();
      const policy = await createDefaultPolicyCallback(config);
      const OSTypes = ['linux', 'mac', 'windows'] as const;
      OSTypes.forEach((os) => {
        expect(policy[os].malware.mode).toBe('off');
        expect(policy[os].memory_protection.mode).toBe('off');
        expect(policy[os].behavior_protection.mode).toBe('off');
      });
      // Ransomware is windows only
      expect(policy.windows.ransomware.mode).toBe('off');
    });
  });

  describe('Global Telemetry Config', () => {
    it('should save telemetry config state in policy based on telemetry config provider', async () => {
      telemetryConfigProviderMock.getIsOptedIn.mockReturnValue(false);
      let policyConfig = await createDefaultPolicyCallback();
      expect(policyConfig.global_telemetry_enabled).toBe(false);

      telemetryConfigProviderMock.getIsOptedIn.mockReturnValue(true);
      policyConfig = await createDefaultPolicyCallback();
      expect(policyConfig.global_telemetry_enabled).toBe(true);
    });

    it('should fallback to `false` when global telemetry config is unavailable', async () => {
      telemetryConfigProviderMock.getIsOptedIn.mockReturnValue(undefined);
      const policyConfig = await createDefaultPolicyCallback();
      expect(policyConfig.global_telemetry_enabled).toBe(false);
    });
  });

  describe('Device Control Removal', () => {
    it('should remove device control when endpointTrustedDevices product feature is disabled', async () => {
      const removeDeviceControlSpy = jest.spyOn(PolicyConfigHelpers, 'removeDeviceControl');
      productFeaturesService = createProductFeaturesServiceMock(
        ALL_PRODUCT_FEATURE_KEYS.filter((key) => key !== 'endpoint_trusted_devices')
      );

      await createDefaultPolicyCallback();

      expect(removeDeviceControlSpy).toHaveBeenCalledTimes(1);
      removeDeviceControlSpy.mockRestore();
    });

    it('should remove device control when trustedDevices experimental feature is disabled', async () => {
      const removeDeviceControlSpy = jest.spyOn(PolicyConfigHelpers, 'removeDeviceControl');
      const experimentalFeaturesWithTrustedDevicesDisabled = {
        trustedDevices: false,
      } as ExperimentalFeatures;

      const createDefaultPolicyCallbackWithDisabledFeature = async (
        config?: AnyPolicyCreateConfig
      ): Promise<PolicyConfig> => {
        const esClientInfo = await elasticsearchServiceMock
          .createClusterClient()
          .asInternalUser.info();
        esClientInfo.cluster_name = '';
        esClientInfo.cluster_uuid = '';
        return createDefaultPolicy(
          licenseService,
          config,
          cloud,
          esClientInfo,
          productFeaturesService,
          telemetryConfigProviderMock,
          experimentalFeaturesWithTrustedDevicesDisabled
        );
      };

      await createDefaultPolicyCallbackWithDisabledFeature();

      expect(removeDeviceControlSpy).toHaveBeenCalledTimes(1);
      removeDeviceControlSpy.mockRestore();
    });

    it('should remove device control when both endpointTrustedDevices product feature and experimental feature are disabled', async () => {
      const removeDeviceControlSpy = jest.spyOn(PolicyConfigHelpers, 'removeDeviceControl');
      productFeaturesService = createProductFeaturesServiceMock(
        ALL_PRODUCT_FEATURE_KEYS.filter((key) => key !== 'endpoint_trusted_devices')
      );
      const experimentalFeaturesWithTrustedDevicesDisabled = {
        trustedDevices: false,
      } as ExperimentalFeatures;

      const createDefaultPolicyCallbackWithBothDisabled = async (
        config?: AnyPolicyCreateConfig
      ): Promise<PolicyConfig> => {
        const esClientInfo = await elasticsearchServiceMock
          .createClusterClient()
          .asInternalUser.info();
        esClientInfo.cluster_name = '';
        esClientInfo.cluster_uuid = '';
        return createDefaultPolicy(
          licenseService,
          config,
          cloud,
          esClientInfo,
          productFeaturesService,
          telemetryConfigProviderMock,
          experimentalFeaturesWithTrustedDevicesDisabled
        );
      };

      await createDefaultPolicyCallbackWithBothDisabled();

      expect(removeDeviceControlSpy).toHaveBeenCalledTimes(1);
      removeDeviceControlSpy.mockRestore();
    });

    it('should NOT remove device control when both endpointTrustedDevices product feature and trustedDevices experimental feature are enabled', async () => {
      const removeDeviceControlSpy = jest.spyOn(PolicyConfigHelpers, 'removeDeviceControl');
      // Both features are enabled by default in the test setup

      await createDefaultPolicyCallback();

      expect(removeDeviceControlSpy).not.toHaveBeenCalled();
      removeDeviceControlSpy.mockRestore();
    });
  });

  describe('Linux DNS Events Feature Flag', () => {
    describe('with linuxDnsEvents feature flag disabled', () => {
      const createDefaultPolicyWithFeature = async (
        config?: AnyPolicyCreateConfig
      ): Promise<PolicyConfig> => {
        const experimentalFeaturesWithDnsDisabled = {
          trustedDevices: true,
          linuxDnsEvents: false,
        } as ExperimentalFeatures;

        const esClientInfo = await elasticsearchServiceMock
          .createClusterClient()
          .asInternalUser.info();
        esClientInfo.cluster_name = '';
        esClientInfo.cluster_uuid = '';
        return createDefaultPolicy(
          licenseService,
          config,
          cloud,
          esClientInfo,
          productFeaturesService,
          telemetryConfigProviderMock,
          experimentalFeaturesWithDnsDisabled
        );
      };

      it('should remove Linux DNS events from default policy', async () => {
        const removeLinuxDnsEventsSpy = jest.spyOn(PolicyConfigHelpers, 'removeLinuxDnsEvents');
        const defaultPolicy = policyFactory();

        const policy = await createDefaultPolicyWithFeature();

        expect(removeLinuxDnsEventsSpy).toHaveBeenCalledTimes(1);
        expect(policy.linux.events).not.toHaveProperty('dns');
        expect(policy.windows.events).toEqual(defaultPolicy.windows.events);
        expect(policy.mac.events).toEqual(defaultPolicy.mac.events);

        removeLinuxDnsEventsSpy.mockRestore();
      });

      it('should remove Linux DNS events when license is below platinum', async () => {
        licenseEmitter.next(Gold);

        const policy = await createDefaultPolicyWithFeature();

        expect(policy.linux.events.dns).toBeUndefined();
      });

      it('should remove Linux DNS events with DataCollection preset', async () => {
        const config = {
          type: 'endpoint',
          endpointConfig: { preset: 'DataCollection' },
        } as PolicyCreateEndpointConfig;

        const policy = await createDefaultPolicyWithFeature(config);

        expect(policy.linux.events.dns).toBeUndefined();
      });

      it('should remove Linux DNS events with NGAV preset', async () => {
        const config = {
          type: 'endpoint',
          endpointConfig: { preset: 'NGAV' },
        } as PolicyCreateEndpointConfig;

        const policy = await createDefaultPolicyWithFeature(config);

        expect(policy.linux.events.dns).toBeUndefined();
      });

      it('should remove Linux DNS events with EDREssential preset', async () => {
        const config = {
          type: 'endpoint',
          endpointConfig: { preset: 'EDREssential' },
        } as PolicyCreateEndpointConfig;

        const policy = await createDefaultPolicyWithFeature(config);

        expect(policy.linux.events.dns).toBeUndefined();
      });

      it('should remove Linux DNS events with EDRComplete preset', async () => {
        const config = {
          type: 'endpoint',
          endpointConfig: { preset: 'EDRComplete' },
        } as PolicyCreateEndpointConfig;

        const policy = await createDefaultPolicyWithFeature(config);

        expect(policy.linux.events.dns).toBeUndefined();
      });

      it('should remove Linux DNS events with cloud config', async () => {
        const config = {
          type: 'cloud',
        } as PolicyCreateCloudConfig;

        const policy = await createDefaultPolicyWithFeature(config);

        expect(policy.linux.events.dns).toBeUndefined();
      });
    });

    describe('with linuxDnsEvents feature flag enabled', () => {
      const createDefaultPolicyWithFeature = async (
        config?: AnyPolicyCreateConfig
      ): Promise<PolicyConfig> => {
        const experimentalFeaturesWithDnsEnabled = {
          trustedDevices: true,
          linuxDnsEvents: true,
        } as ExperimentalFeatures;

        const esClientInfo = await elasticsearchServiceMock
          .createClusterClient()
          .asInternalUser.info();
        esClientInfo.cluster_name = '';
        esClientInfo.cluster_uuid = '';
        return createDefaultPolicy(
          licenseService,
          config,
          cloud,
          esClientInfo,
          productFeaturesService,
          telemetryConfigProviderMock,
          experimentalFeaturesWithDnsEnabled
        );
      };

      it('should NOT remove Linux DNS events from default policy', async () => {
        const removeLinuxDnsEventsSpy = jest.spyOn(PolicyConfigHelpers, 'removeLinuxDnsEvents');
        const defaultPolicy = policyFactory();

        const policy = await createDefaultPolicyWithFeature();

        expect(removeLinuxDnsEventsSpy).not.toHaveBeenCalled();
        expect(policy.linux.events.dns).toBe(true);
        expect(policy.linux.events).toEqual(defaultPolicy.linux.events);
        expect(policy.windows.events).toEqual(defaultPolicy.windows.events);
        expect(policy.mac.events).toEqual(defaultPolicy.mac.events);

        removeLinuxDnsEventsSpy.mockRestore();
      });

      it('should include Linux DNS events when license is below platinum', async () => {
        licenseEmitter.next(Gold);

        const policy = await createDefaultPolicyWithFeature();

        expect(policy.linux.events.dns).toBe(true);
      });

      it('should include Linux DNS events with DataCollection preset', async () => {
        const config = {
          type: 'endpoint',
          endpointConfig: { preset: 'DataCollection' },
        } as PolicyCreateEndpointConfig;

        const policy = await createDefaultPolicyWithFeature(config);

        expect(policy.linux.events.dns).toBe(true);
      });

      it('should include Linux DNS events with NGAV preset (but set to false)', async () => {
        const config = {
          type: 'endpoint',
          endpointConfig: { preset: 'NGAV' },
        } as PolicyCreateEndpointConfig;

        const policy = await createDefaultPolicyWithFeature(config);

        expect(policy.linux.events.dns).toBe(false);
      });

      it('should include Linux DNS events with EDREssential preset (but set to false)', async () => {
        const config = {
          type: 'endpoint',
          endpointConfig: { preset: 'EDREssential' },
        } as PolicyCreateEndpointConfig;

        const policy = await createDefaultPolicyWithFeature(config);

        expect(policy.linux.events.dns).toBe(false);
      });

      it('should include Linux DNS events with EDRComplete preset', async () => {
        const config = {
          type: 'endpoint',
          endpointConfig: { preset: 'EDRComplete' },
        } as PolicyCreateEndpointConfig;

        const policy = await createDefaultPolicyWithFeature(config);

        expect(policy.linux.events.dns).toBe(true);
      });

      it('should include Linux DNS events with cloud config', async () => {
        const config = {
          type: 'cloud',
        } as PolicyCreateCloudConfig;

        const policy = await createDefaultPolicyWithFeature(config);

        expect(policy.linux.events.dns).toBe(true);
      });
    });
  });
});
