/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { FeatureFlagsStart, KibanaRequest } from '@kbn/core/server';
import { NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';
import { NIGHTSHIFT_DEFAULT_MODELS } from '@kbn/significant-events-schema';
import {
  isInvestigationInfrastructureAvailable,
  isInvestigationRunAvailable,
} from './is_investigation_available';

const request = {} as KibanaRequest;
const warn = jest.fn();
const logger = { warn } as never;
const workflow = { enabled: true, valid: true, definition: {} };
const agentBuilder = {} as never;
const workflowsExtensions = {} as never;
const workflowsManagement = {
  management: { getClient: () => ({ getWorkflow: jest.fn().mockResolvedValue(workflow) }) },
} as never;
const getConnectorById = jest.fn(async (connectorId: string) => ({ connectorId }));
const getClient = jest.fn();
const inference = {
  getClient,
  getConnectorById,
} as never;

const createFeatureFlagsMock = (enabled = true): FeatureFlagsStart =>
  ({
    getBooleanValue$: jest.fn().mockReturnValue(of(enabled)),
  }) as unknown as FeatureFlagsStart;

const createDependencies = (featureFlags = createFeatureFlagsMock(true)) => ({
  request,
  featureFlags,
  agentBuilder,
  inference,
  logger,
  workflowsExtensions,
  workflowsManagement,
});

beforeEach(() => {
  jest.clearAllMocks();
  getConnectorById.mockImplementation(async (connectorId: string) => ({ connectorId }));
});

it('returns true when every infrastructure requirement is available', async () => {
  const featureFlags = createFeatureFlagsMock(true);

  await expect(
    isInvestigationInfrastructureAvailable(createDependencies(featureFlags))
  ).resolves.toBe(true);
  expect(featureFlags.getBooleanValue$).toHaveBeenCalledWith(NIGHTSHIFT_ENABLED_FLAG, false);
  expect(getConnectorById).not.toHaveBeenCalled();
});

it('returns false when feature flag is disabled', async () => {
  const featureFlags = createFeatureFlagsMock(false);

  await expect(
    isInvestigationInfrastructureAvailable(createDependencies(featureFlags))
  ).resolves.toBe(false);

  expect(featureFlags.getBooleanValue$).toHaveBeenCalledWith(NIGHTSHIFT_ENABLED_FLAG, false);
});

it('returns false when any infrastructure dependency or workflow definition is unavailable', async () => {
  const featureFlags = createFeatureFlagsMock(true);

  await expect(
    isInvestigationInfrastructureAvailable({ request, featureFlags, logger })
  ).resolves.toBe(false);
  await expect(
    isInvestigationInfrastructureAvailable({
      ...createDependencies(featureFlags),
      workflowsManagement: {
        management: { getClient: () => ({ getWorkflow: jest.fn().mockResolvedValue({}) }) },
      } as never,
    })
  ).resolves.toBe(false);
});

it('returns false when a requirement probe fails', async () => {
  const featureFlags = createFeatureFlagsMock(true);

  await expect(
    isInvestigationInfrastructureAvailable({
      ...createDependencies(featureFlags),
      workflowsManagement: {
        management: {
          getClient: () => ({
            getWorkflow: jest.fn().mockRejectedValue(new Error('unavailable')),
          }),
        },
      } as never,
    })
  ).resolves.toBe(false);
  expect(warn).toHaveBeenCalledWith(
    'Failed to check investigation infrastructure availability: Error: unavailable'
  );
});

it('returns true for a valid explicit connector when the default is missing', async () => {
  getConnectorById.mockImplementation(async (connectorId: string) => {
    if (connectorId === NIGHTSHIFT_DEFAULT_MODELS.investigation) {
      throw new Error('default missing');
    }
    return { connectorId };
  });

  await expect(
    isInvestigationRunAvailable({
      ...createDependencies(),
      connectorId: 'custom-model',
    })
  ).resolves.toBe(true);
  expect(getConnectorById).toHaveBeenCalledWith('custom-model', request);
  expect(getClient).not.toHaveBeenCalled();
});

it('returns false when the default model is missing and no connector is explicit', async () => {
  getConnectorById.mockRejectedValue(new Error('default missing'));

  await expect(isInvestigationRunAvailable(createDependencies())).resolves.toBe(false);
  expect(getConnectorById).toHaveBeenCalledWith(NIGHTSHIFT_DEFAULT_MODELS.investigation, request);
});
