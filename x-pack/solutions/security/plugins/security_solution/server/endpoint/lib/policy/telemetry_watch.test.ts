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
import {
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  type PackagePolicy,
  type UpdatePackagePolicy,
} from '@kbn/fleet-plugin/common';
import { createPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';
import { policyFactory } from '../../../../common/endpoint/models/policy_config';
import type { PolicyConfig } from '../../../../common/endpoint/types';
import { TelemetryConfigWatcher } from './telemetry_watch';
import { TelemetryConfigProvider } from '../../../../common/telemetry_config/telemetry_config_provider';
import { createMockEndpointAppContextService } from '../../mocks';
import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { NewPackagePolicyWithId } from '@kbn/fleet-plugin/server/services/package_policy';

const MockPackagePolicyWithEndpointPolicy = (
  cb?: (p: PolicyConfig) => PolicyConfig
): PackagePolicy => {
  const packagePolicy = createPackagePolicyMock();

  const policyConfig = cb?.(policyFactory()) ?? policyFactory();

  packagePolicy.inputs[0].config = { policy: { value: policyConfig } };

  return packagePolicy;
};

describe('Telemetry config watcher', () => {
  const esStartMock = elasticsearchServiceMock.createStart();

  let mockedLogger: MockedLogger;
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
    packagePolicyServiceMock.bulkUpdate.mockResolvedValue({
      updatedPolicies: [],
      failedPolicies: [],
    });

    mockedLogger = loggerMock.create();
    const endpointAppContextServiceMock = createMockEndpointAppContextService();
    endpointAppContextServiceMock.createLogger = jest.fn().mockReturnValue(mockedLogger);

    telemetryWatcher = new TelemetryConfigWatcher(
      packagePolicyServiceMock,
      esStartMock,
      endpointAppContextServiceMock,
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

    expect(mockedLogger.warn).not.toHaveBeenCalled();
    expect(mockedLogger.error).not.toHaveBeenCalled();
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

      await telemetryWatcher.watch(true);

      expect(packagePolicyServiceMock.list).toBeCalledTimes(2);
      const expectedParams = {
        page: 1,
        perPage: 100,
        kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: endpoint`,
        spaceId: '*',
      };
      expect(packagePolicyServiceMock.list.mock.calls[0][1]).toStrictEqual(expectedParams);
      expect(packagePolicyServiceMock.list.mock.calls[1][1]).toStrictEqual(expectedParams);

      expect(mockedLogger.warn).not.toHaveBeenCalled();
      expect(mockedLogger.error).not.toHaveBeenCalled();
    });

    it('retries fetching package policies maximum 5 times', async () => {
      packagePolicyServiceMock.list.mockRejectedValue(new Error());

      await telemetryWatcher.watch(true);

      expect(packagePolicyServiceMock.list).toBeCalledTimes(5);
      expect(mockedLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockedLogger.error).not.toHaveBeenCalled();
    });

    it('retries bulk updating package policies', async () => {
      preparePackagePolicyMock({ isGlobalTelemetryEnabled: true });
      packagePolicyServiceMock.bulkUpdate.mockRejectedValueOnce(new Error());

      await telemetryWatcher.watch(false);

      expect(packagePolicyServiceMock.bulkUpdate).toHaveBeenCalledTimes(2);
      expect(mockedLogger.warn).not.toHaveBeenCalled();
      expect(mockedLogger.error).not.toHaveBeenCalled();
    });

    it('retries bulk updating package policies maximum 5 times', async () => {
      preparePackagePolicyMock({ isGlobalTelemetryEnabled: true });
      packagePolicyServiceMock.bulkUpdate.mockRejectedValue(new Error());

      await telemetryWatcher.watch(false);

      expect(packagePolicyServiceMock.bulkUpdate).toHaveBeenCalledTimes(5);
      expect(mockedLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockedLogger.error).not.toHaveBeenCalled();
    });

    it('logs the ids of package policies that are failed to be updated', async () => {
      preparePackagePolicyMock({ isGlobalTelemetryEnabled: true });
      packagePolicyServiceMock.bulkUpdate.mockResolvedValueOnce({
        updatedPolicies: [],
        failedPolicies: [
          {
            error: new Error('error message 1'),
            packagePolicy: { id: 'policy-id-1' } as NewPackagePolicyWithId,
          },
          {
            error: new Error('error message 2'),
            packagePolicy: { id: 'policy-id-2' } as NewPackagePolicyWithId,
          },
        ],
      });

      await telemetryWatcher.watch(false);

      expect(packagePolicyServiceMock.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(mockedLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockedLogger.error).not.toHaveBeenCalled();

      const logMessage = mockedLogger.warn.mock.calls[0][0] as string;
      expect(logMessage).toMatch(/- id: policy-id-1, error:.+error message 1/);
      expect(logMessage).toMatch(/- id: policy-id-2, error:.+error message 2/);
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
