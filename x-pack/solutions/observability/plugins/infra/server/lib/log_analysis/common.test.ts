/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { CPSServerSetup } from '@kbn/cps/server';
import type { InfraPluginStartServicesAccessor, MlSystem, ServerlessInfo } from '../../types';
import {
  createIsCpsPlatformGateEnabled,
  fetchIsInfraMlCpsEnabled,
  resolveJobProjectRouting,
} from './common';

const createMlJob = (datafeedConfig?: Record<string, unknown>): estypes.MlJob =>
  ({
    job_id: 'test-job',
    ...(datafeedConfig ? { datafeed_config: datafeedConfig } : {}),
  } as unknown as estypes.MlJob);

describe('resolveJobProjectRouting', () => {
  it('returns the stored project routing when the datafeed has one', () => {
    expect(resolveJobProjectRouting(createMlJob({ project_routing: '_alias:_origin' }), true)).toBe(
      '_alias:_origin'
    );
  });

  it('falls back to all projects for unscoped datafeeds with a cloud API key', () => {
    expect(
      resolveJobProjectRouting(
        createMlJob({ authorization: { cloud_api_key: { id: 'key-id' } } }),
        true
      )
    ).toBe('_alias:*');
  });

  it('falls back to the origin project for unscoped datafeeds without a cloud API key', () => {
    expect(resolveJobProjectRouting(createMlJob({}), true)).toBe('_alias:_origin');
  });

  it('returns undefined for jobs without a datafeed', () => {
    expect(resolveJobProjectRouting(createMlJob(), true)).toBeUndefined();
  });

  it('returns undefined when the Logs ML CPS gate is disabled', () => {
    expect(
      resolveJobProjectRouting(createMlJob({ project_routing: '_alias:_origin' }), false)
    ).toBeUndefined();
  });
});

describe('createIsCpsPlatformGateEnabled', () => {
  const createGate = ({
    serverless = { isServerless: true, cpsEnabled: true },
    hasCps = true,
    isFeatureFlagEnabled = true,
    isTierEligible = true,
  }: {
    serverless?: ServerlessInfo;
    hasCps?: boolean;
    isFeatureFlagEnabled?: boolean;
    isTierEligible?: boolean;
  } = {}) => {
    const getBooleanValue = jest.fn().mockResolvedValue(isFeatureFlagEnabled);
    const isTierEligibleMock = jest.fn().mockResolvedValue(isTierEligible);
    const getStartServices = jest.fn().mockResolvedValue([{ featureFlags: { getBooleanValue } }]);

    return {
      gate: createIsCpsPlatformGateEnabled({
        serverless,
        cps: hasCps
          ? ({ isTierEligible: isTierEligibleMock } as unknown as CPSServerSetup)
          : undefined,
        getStartServices: getStartServices as unknown as InfraPluginStartServicesAccessor,
      }),
      getBooleanValue,
      getStartServices,
      isTierEligibleMock,
    };
  };

  it('is false outside serverless, without consulting further conditions', async () => {
    const { gate, getStartServices } = createGate({
      serverless: { isServerless: false, cpsEnabled: false },
    });

    await expect(gate()).resolves.toBe(false);
    expect(getStartServices).not.toHaveBeenCalled();
  });

  it('is false when the CPS config is disabled', async () => {
    const { gate, getStartServices } = createGate({
      serverless: { isServerless: true, cpsEnabled: false },
    });

    await expect(gate()).resolves.toBe(false);
    expect(getStartServices).not.toHaveBeenCalled();
  });

  it('is false when the cps plugin is unavailable', async () => {
    const { gate, getStartServices } = createGate({ hasCps: false });

    await expect(gate()).resolves.toBe(false);
    expect(getStartServices).not.toHaveBeenCalled();
  });

  it('is false when the feature flag is disabled, without consulting tier eligibility', async () => {
    const { gate, isTierEligibleMock } = createGate({ isFeatureFlagEnabled: false });

    await expect(gate()).resolves.toBe(false);
    expect(isTierEligibleMock).not.toHaveBeenCalled();
  });

  it('is false when the pricing tier is not eligible', async () => {
    const { gate } = createGate({ isTierEligible: false });

    await expect(gate()).resolves.toBe(false);
  });

  it('is true when every platform condition holds', async () => {
    const { gate } = createGate();

    await expect(gate()).resolves.toBe(true);
  });
});

describe('fetchIsInfraMlCpsEnabled', () => {
  const createMlSystem = (mlInfo: jest.Mock): MlSystem => ({ mlInfo } as unknown as MlSystem);

  it('is false without calling ML when the platform gate is disabled', async () => {
    const mlInfo = jest.fn();

    await expect(fetchIsInfraMlCpsEnabled(async () => false, createMlSystem(mlInfo))).resolves.toBe(
      false
    );
    expect(mlInfo).not.toHaveBeenCalled();
  });

  it('is true when Elasticsearch supports ML cross-project search', async () => {
    const mlInfo = jest.fn().mockResolvedValue({ isMlCpsEnabled: true });

    await expect(fetchIsInfraMlCpsEnabled(async () => true, createMlSystem(mlInfo))).resolves.toBe(
      true
    );
  });

  it('is false when Elasticsearch does not support ML cross-project search', async () => {
    const mlInfo = jest.fn().mockResolvedValue({ isMlCpsEnabled: false });

    await expect(fetchIsInfraMlCpsEnabled(async () => true, createMlSystem(mlInfo))).resolves.toBe(
      false
    );
  });

  it('fails closed when the ML info API errors', async () => {
    const mlInfo = jest.fn().mockRejectedValue(new Error('network error'));

    await expect(fetchIsInfraMlCpsEnabled(async () => true, createMlSystem(mlInfo))).resolves.toBe(
      false
    );
  });
});
