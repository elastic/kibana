/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { createPackagePolicyServiceMock } from '@kbn/fleet-plugin/server/mocks';
import type { PackagePolicyClient } from '@kbn/fleet-plugin/server';
import type { PackagePolicy, UpdatePackagePolicy } from '@kbn/fleet-plugin/common';
import { createPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';
import { policyFactory } from '../../../../common/endpoint/models/policy_config';
import type { PolicyConfig } from '../../../../common/endpoint/types';
import { TelemetryConfigWatcher } from './telemetry_watch';
import { TelemetryConfigProvider } from '../../../../common/telemetry_config/telemetry_config_provider';
import { createMockEndpointAppContextService } from '../../mocks';

const MockPackagePolicyWithEndpointPolicy = (
  cb?: (p: PolicyConfig) => PolicyConfig
): PackagePolicy => {
  const packagePolicy = createPackagePolicyMock();
  if (!cb) {
    // eslint-disable-next-line no-param-reassign
    cb = (p) => p;
  }
  const policyConfig = cb(policyFactory());
  packagePolicy.inputs[0].config = { policy: { value: policyConfig } };

  return packagePolicy;
};

describe('Telemetry config watcher', () => {
  const esStartMock = elasticsearchServiceMock.createStart();
  let packagePolicyServiceMock: jest.Mocked<PackagePolicyClient>;
  let telemetryWatcher: TelemetryConfigWatcher;

  const preparePackagePolicyMock = ({
    isGlobalTelemetryEnabled,
  }: {
    isGlobalTelemetryEnabled: boolean;
  }) => {
    packagePolicyServiceMock.list.mockResolvedValueOnce({
      items: [
        MockPackagePolicyWithEndpointPolicy((pc: PolicyConfig): PolicyConfig => {
          pc.global_telemetry_enabled = isGlobalTelemetryEnabled;
          return pc;
        }),
      ],
      total: 1,
      page: 1,
      perPage: 100,
    });
  };

  beforeEach(() => {
    packagePolicyServiceMock = createPackagePolicyServiceMock();

    telemetryWatcher = new TelemetryConfigWatcher(
      packagePolicyServiceMock,
      esStartMock,
      createMockEndpointAppContextService(),
      { immediateRetry: true }
    );
  });

  it('is activated on telemetry config changes', () => {
    const telemetryConfigEmitter: Subject<boolean> = new Subject();
    const telemetryConfigProvider = new TelemetryConfigProvider();

    // spy on the watch() function
    const mockWatch = jest.fn();
    telemetryWatcher.watch = mockWatch;

    telemetryConfigProvider.start(telemetryConfigEmitter);
    telemetryWatcher.start(telemetryConfigProvider);

    telemetryConfigEmitter.next(true);

    expect(mockWatch).toBeCalledTimes(1);

    telemetryWatcher.stop();
    telemetryConfigProvider.stop();
    telemetryConfigEmitter.complete();
  });

  it('pages through all endpoint policies', async () => {
    const TOTAL = 247;

    // set up the mocked package policy service to return and do what we want
    packagePolicyServiceMock.list
      .mockResolvedValueOnce({
        items: Array.from({ length: 100 }, () => MockPackagePolicyWithEndpointPolicy()),
        total: TOTAL,
        page: 1,
        perPage: 100,
      })
      .mockResolvedValueOnce({
        items: Array.from({ length: 100 }, () => MockPackagePolicyWithEndpointPolicy()),
        total: TOTAL,
        page: 2,
        perPage: 100,
      })
      .mockResolvedValueOnce({
        items: Array.from({ length: TOTAL - 200 }, () => MockPackagePolicyWithEndpointPolicy()),
        total: TOTAL,
        page: 3,
        perPage: 100,
      });

    await telemetryWatcher.watch(true); // manual trigger

    expect(packagePolicyServiceMock.list).toBeCalledTimes(3);

    // Assert: on the first call to packagePolicy.list, we asked for page 1
    expect(packagePolicyServiceMock.list.mock.calls[0][1].page).toBe(1);
    expect(packagePolicyServiceMock.list.mock.calls[1][1].page).toBe(2); // second call, asked for page 2
    expect(packagePolicyServiceMock.list.mock.calls[2][1].page).toBe(3); // etc
  });

  describe('error handling', () => {
    it('retries fetching package policies', async () => {
      packagePolicyServiceMock.list.mockRejectedValueOnce(new Error());

      packagePolicyServiceMock.list.mockResolvedValueOnce({
        items: Array.from({ length: 6 }, () => MockPackagePolicyWithEndpointPolicy()),
        total: 6,
        page: 1,
        perPage: 100,
      });

      await telemetryWatcher.watch(true); // manual trigger

      expect(packagePolicyServiceMock.list).toBeCalledTimes(2);
    });

    it('retries fetching package policies maximum 5 times', async () => {
      packagePolicyServiceMock.list.mockRejectedValue(new Error());

      await telemetryWatcher.watch(true); // manual trigger

      expect(packagePolicyServiceMock.list).toBeCalledTimes(5);
    });

    it('retries bulk updating package policies', async () => {
      preparePackagePolicyMock({ isGlobalTelemetryEnabled: true });
      packagePolicyServiceMock.bulkUpdate.mockRejectedValueOnce(new Error());
      packagePolicyServiceMock.bulkUpdate.mockRejectedValue(null);

      await telemetryWatcher.watch(false);

      expect(packagePolicyServiceMock.bulkUpdate).toHaveBeenCalledTimes(2);
    });

    it('retries bulk updating package policies maximum 5 times', async () => {
      preparePackagePolicyMock({ isGlobalTelemetryEnabled: true });
      packagePolicyServiceMock.bulkUpdate.mockRejectedValue(new Error());

      await telemetryWatcher.watch(false);

      expect(packagePolicyServiceMock.bulkUpdate).toHaveBeenCalledTimes(5);
    });
  });

  it.each([true, false])(
    'does not update policies if both global telemetry config and policy fields are %s',
    async (value) => {
      preparePackagePolicyMock({ isGlobalTelemetryEnabled: value });

      await telemetryWatcher.watch(value);

      expect(packagePolicyServiceMock.bulkUpdate).not.toHaveBeenCalled();
    }
  );

  it.each([true, false])('updates `global_telemetry_enabled` field to %s', async (value) => {
    preparePackagePolicyMock({ isGlobalTelemetryEnabled: !value });

    await telemetryWatcher.watch(value);

    expect(packagePolicyServiceMock.bulkUpdate).toHaveBeenCalled();
    const policyUpdates: UpdatePackagePolicy[] =
      packagePolicyServiceMock.bulkUpdate.mock.calls[0][2];
    expect(policyUpdates.length).toBe(1);
    const updatedPolicyConfigs: PolicyConfig = policyUpdates[0].inputs[0].config?.policy.value;
    expect(updatedPolicyConfigs.global_telemetry_enabled).toBe(value);
  });
});
