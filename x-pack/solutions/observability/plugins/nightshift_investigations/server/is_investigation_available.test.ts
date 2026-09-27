/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { FeatureFlagsStart, KibanaRequest } from '@kbn/core/server';
import { NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';
import { isInvestigationAvailable } from './is_investigation_available';

const request = {} as KibanaRequest;
const warn = jest.fn();
const logger = { warn } as never;
const workflow = { enabled: true, valid: true, definition: {} };
const agentBuilder = {} as never;
const workflowsExtensions = {} as never;
const workflowsManagement = {
  management: { getClient: () => ({ getWorkflow: jest.fn().mockResolvedValue(workflow) }) },
} as never;

const createFeatureFlagsMock = (enabled = true): FeatureFlagsStart =>
  ({
    getBooleanValue$: jest.fn().mockReturnValue(of(enabled)),
  } as unknown as FeatureFlagsStart);

it('returns true when every start requirement is available', async () => {
  const featureFlags = createFeatureFlagsMock(true);
  const getForFeature = jest
    .fn()
    .mockResolvedValue({ endpoints: [{ connectorId: 'connector-1' }] });

  await expect(
    isInvestigationAvailable({
      request,
      featureFlags,
      agentBuilder,
      logger,
      searchInferenceEndpoints: { endpoints: { getForFeature } } as never,
      workflowsExtensions,
      workflowsManagement,
    })
  ).resolves.toBe(true);
  expect(featureFlags.getBooleanValue$).toHaveBeenCalledWith(NIGHTSHIFT_ENABLED_FLAG, false);
  expect(getForFeature).toHaveBeenCalledWith('significant_events_investigation', request);
});

it('returns false when feature flag is disabled', async () => {
  const featureFlags = createFeatureFlagsMock(false);

  await expect(
    isInvestigationAvailable({
      request,
      featureFlags,
      agentBuilder,
      logger,
      searchInferenceEndpoints: {
        endpoints: { getForFeature: jest.fn() },
      } as never,
      workflowsExtensions,
      workflowsManagement,
    })
  ).resolves.toBe(false);

  expect(featureFlags.getBooleanValue$).toHaveBeenCalledWith(NIGHTSHIFT_ENABLED_FLAG, false);
});

it('returns false when any dependency, connector, or workflow definition is unavailable', async () => {
  const featureFlags = createFeatureFlagsMock(true);
  const getForFeature = jest.fn().mockResolvedValue({ endpoints: [] });

  await expect(
    isInvestigationAvailable({
      request,
      featureFlags,
      agentBuilder,
      logger,
      searchInferenceEndpoints: { endpoints: { getForFeature } } as never,
      workflowsExtensions,
      workflowsManagement,
    })
  ).resolves.toBe(false);
  await expect(isInvestigationAvailable({ request, featureFlags, logger })).resolves.toBe(false);
  await expect(
    isInvestigationAvailable({
      request,
      featureFlags,
      agentBuilder,
      logger,
      searchInferenceEndpoints: {
        endpoints: {
          getForFeature: jest
            .fn()
            .mockResolvedValue({ endpoints: [{ connectorId: 'connector-1' }] }),
        },
      } as never,
      workflowsExtensions,
      workflowsManagement: {
        management: { getClient: () => ({ getWorkflow: jest.fn().mockResolvedValue({}) }) },
      } as never,
    })
  ).resolves.toBe(false);
});

it('returns false when a requirement probe fails', async () => {
  const featureFlags = createFeatureFlagsMock(true);

  await expect(
    isInvestigationAvailable({
      request,
      featureFlags,
      agentBuilder,
      logger,
      searchInferenceEndpoints: {
        endpoints: { getForFeature: jest.fn().mockRejectedValue(new Error('unavailable')) },
      } as never,
      workflowsExtensions,
      workflowsManagement,
    })
  ).resolves.toBe(false);
  expect(warn).toHaveBeenCalledWith(
    'Failed to check investigation availability: Error: unavailable'
  );
});
