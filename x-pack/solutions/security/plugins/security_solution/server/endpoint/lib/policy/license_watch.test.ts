/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry from 'p-retry';
import { Subject } from 'rxjs';
import { LicenseService } from '../../../../common/license';
import { PolicyWatcher } from './license_watch';
import type { ILicense } from '@kbn/licensing-plugin/common/types';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import type { PackagePolicyClient } from '@kbn/fleet-plugin/server';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { createPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';
import { policyFactory } from '../../../../common/endpoint/models/policy_config';
import type { PolicyConfig } from '../../../../common/endpoint/types';
import { createMockEndpointAppContextService } from '../../mocks';

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('p-retry', () => {
  const originalPRetry = jest.requireActual('p-retry');
  return jest.fn().mockImplementation((fn, options) => {
    return originalPRetry(fn, options);
  });
});

const pRetryMock = jest.mocked(pRetry);

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

describe('Policy-Changing license watcher', () => {
  let endpointServiceMock: ReturnType<typeof createMockEndpointAppContextService>;
  let packagePolicySvcMock: jest.Mocked<PackagePolicyClient>;

  const Platinum = licenseMock.createLicense({ license: { type: 'platinum', mode: 'platinum' } });
  const Gold = licenseMock.createLicense({ license: { type: 'gold', mode: 'gold' } });
  const Basic = licenseMock.createLicense({ license: { type: 'basic', mode: 'basic' } });

  beforeEach(() => {
    endpointServiceMock = createMockEndpointAppContextService();
    packagePolicySvcMock = endpointServiceMock.getInternalFleetServices()
      .packagePolicy as jest.Mocked<PackagePolicyClient>;
  });

  it('is activated on license changes', () => {
    // mock a license-changing service to test reactivity
    const licenseEmitter: Subject<ILicense> = new Subject();
    const licenseService = new LicenseService();
    const pw = new PolicyWatcher(endpointServiceMock);

    // swap out watch function, just to ensure it gets called when a license change happens
    const mockWatch = jest.fn();
    pw.watch = mockWatch;

    // licenseService is watching our subject for incoming licenses
    licenseService.start(licenseEmitter);
    pw.start(licenseService); // and the PolicyWatcher under test, uses that to subscribe as well

    // Enqueue a license change!
    licenseEmitter.next(Platinum);

    // policywatcher should have triggered
    expect(mockWatch.mock.calls.length).toBe(1);

    pw.stop();
    licenseService.stop();
    licenseEmitter.complete();
  });

  it('pages through all endpoint policies', async () => {
    const TOTAL = 247;

    // set up the mocked package policy service to return and do what we want
    packagePolicySvcMock.list
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

    const pw = new PolicyWatcher(endpointServiceMock);
    await pw.watch(Gold); // just manually trigger with a given license

    expect(packagePolicySvcMock.list.mock.calls.length).toBe(3); // should have asked for 3 pages of resuts

    // Assert: on the first call to packagePolicy.list, we asked for page 1
    expect(packagePolicySvcMock.list.mock.calls[0][1].page).toBe(1);
    expect(packagePolicySvcMock.list.mock.calls[1][1].page).toBe(2); // second call, asked for page 2
    expect(packagePolicySvcMock.list.mock.calls[2][1].page).toBe(3); // etc
  });

  it('alters no-longer-licensed features', async () => {
    const CustomMessage = 'Custom string';

    // mock a Policy with a higher-tiered feature enabled
    packagePolicySvcMock.list.mockResolvedValueOnce({
      items: [
        MockPackagePolicyWithEndpointPolicy((pc: PolicyConfig): PolicyConfig => {
          pc.windows.popup.malware.message = CustomMessage;
          return pc;
        }),
      ],
      total: 1,
      page: 1,
      perPage: 100,
    });

    const pw = new PolicyWatcher(endpointServiceMock);

    // emulate a license change below paid tier
    await pw.watch(Basic);

    expect(packagePolicySvcMock.update).toHaveBeenCalled();
    expect(
      packagePolicySvcMock.update.mock.calls[0][3].inputs[0].config?.policy.value.windows.popup
        .malware.message
    ).not.toEqual(CustomMessage);
  });

  describe('retry logic', () => {
    beforeEach(() => {
      pRetryMock.mockClear();
    });

    it('retries package policy list operations on failure', async () => {
      pRetryMock.mockImplementationOnce((fn: any, options: any) => {
        const mockError = {
          message: 'Network error',
          attemptNumber: 1,
          retriesLeft: 2,
        };
        options.onFailedAttempt(mockError);

        const mockError2 = {
          message: 'Network error',
          attemptNumber: 2,
          retriesLeft: 1,
        };
        options.onFailedAttempt(mockError2);

        // finally succeed
        return Promise.resolve(fn());
      });

      packagePolicySvcMock.list.mockResolvedValueOnce({
        items: [MockPackagePolicyWithEndpointPolicy()],
        total: 1,
        page: 1,
        perPage: 100,
      });

      const pw = new PolicyWatcher(endpointServiceMock);
      await pw.watch(Gold);

      expect(pRetry).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          retries: 3,
          minTimeout: 1000,
          maxTimeout: 5000,
          onFailedAttempt: expect.any(Function),
        })
      );
    });

    it('retries package policy update operations on failure', async () => {
      const CustomMessage = 'Custom string';

      pRetryMock.mockImplementation((fn: any, options: any) => {
        if (fn.name === 'bound list') {
          return Promise.resolve(fn());
        }

        // simulate retry
        const mockError = {
          message: 'Update failed',
          attemptNumber: 1,
          retriesLeft: 2,
        };
        options.onFailedAttempt(mockError);

        return Promise.resolve(fn());
      });

      packagePolicySvcMock.list.mockResolvedValueOnce({
        items: [
          MockPackagePolicyWithEndpointPolicy((pc: PolicyConfig): PolicyConfig => {
            pc.windows.popup.malware.message = CustomMessage;
            return pc;
          }),
        ],
        total: 1,
        page: 1,
        perPage: 100,
      });

      const pw = new PolicyWatcher(endpointServiceMock);
      await pw.watch(Basic);

      expect(packagePolicySvcMock.update).toHaveBeenCalled();
      expect(pRetry).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          retries: 3,
          minTimeout: 1000,
          maxTimeout: 5000,
          onFailedAttempt: expect.any(Function),
        })
      );
    });

    it('logs retry attempts for package policy list failures', async () => {
      const loggerSpy = jest.spyOn(endpointServiceMock.createLogger(), 'debug');

      pRetryMock.mockImplementationOnce((fn: any, options: any) => {
        // simulate a failed attempt
        const mockError = {
          message: 'Network timeout',
          attemptNumber: 1,
          retriesLeft: 2,
        };
        options.onFailedAttempt(mockError);

        // then succeed
        return Promise.resolve(fn());
      });

      packagePolicySvcMock.list.mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        perPage: 100,
      });

      const pw = new PolicyWatcher(endpointServiceMock);
      await pw.watch(Gold);

      expect(loggerSpy).toHaveBeenCalledWith(
        'attempt 1 to fetch endpoint policies failed. Trying again. [ERROR: Network timeout]'
      );
    });

    it('logs retry attempts for package policy update failures', async () => {
      const loggerSpy = jest.spyOn(endpointServiceMock.createLogger(), 'debug');

      pRetryMock.mockImplementation((fn: any, options: any) => {
        if (fn.name === 'bound list') {
          return Promise.resolve(fn());
        }

        // simulate retry
        const mockError = {
          message: 'Update timeout',
          attemptNumber: 1,
          retriesLeft: 2,
        };
        options.onFailedAttempt(mockError);

        return Promise.resolve(fn());
      });

      packagePolicySvcMock.list.mockResolvedValueOnce({
        items: [
          MockPackagePolicyWithEndpointPolicy((pc: PolicyConfig): PolicyConfig => {
            pc.windows.popup.malware.message = 'Custom';
            return pc;
          }),
        ],
        total: 1,
        page: 1,
        perPage: 100,
      });

      const pw = new PolicyWatcher(endpointServiceMock);
      await pw.watch(Basic);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('attempt 1 to update endpoint policy')
      );
    });
  });
});
