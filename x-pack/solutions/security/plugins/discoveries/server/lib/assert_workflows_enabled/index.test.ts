/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import type { RequestHandlerContext } from '@kbn/core/server';

import { assertWorkflowsEnabled, ATTACK_DISCOVERY_WORKFLOWS_ENABLED_FEATURE_FLAG } from '.';

const createMockContext = (
  featureFlagValue: boolean,
  uiSettingValue = true
): RequestHandlerContext =>
  ({
    core: Promise.resolve({
      featureFlags: {
        getBooleanValue: jest.fn().mockResolvedValue(featureFlagValue),
      },
      uiSettings: {
        client: {
          get: jest.fn().mockResolvedValue(uiSettingValue),
        },
      },
    }),
  } as unknown as RequestHandlerContext);

describe('assertWorkflowsEnabled', () => {
  const response = httpServerMock.createResponseFactory();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when the feature flag is enabled', async () => {
    const context = createMockContext(true);

    const result = await assertWorkflowsEnabled({ context, response });

    expect(result).toBeNull();
  });

  it('returns a 404 response when the feature flag is disabled', async () => {
    const context = createMockContext(false);

    const result = await assertWorkflowsEnabled({ context, response });

    expect(result).not.toBeNull();
    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: 'Attack Discovery workflows are not enabled' },
    });
  });

  it('reads the correct feature flag key', async () => {
    const getBooleanValue = jest.fn().mockResolvedValue(true);
    const context = {
      core: Promise.resolve({
        featureFlags: { getBooleanValue },
        uiSettings: {
          client: { get: jest.fn().mockResolvedValue(true) },
        },
      }),
    } as unknown as RequestHandlerContext;

    await assertWorkflowsEnabled({ context, response });

    // isWorkflowsEnabled (used internally) defaults to true (fail-open for the
    // FF layer); fail-closed is enforced by the per-space uiSetting defaulting
    // to false.
    expect(getBooleanValue).toHaveBeenCalledWith(
      ATTACK_DISCOVERY_WORKFLOWS_ENABLED_FEATURE_FLAG,
      true
    );
  });

  it('treats a null feature flag value as disabled', async () => {
    const context = {
      core: Promise.resolve({
        featureFlags: {
          getBooleanValue: jest.fn().mockResolvedValue(null),
        },
        uiSettings: {
          client: { get: jest.fn().mockResolvedValue(true) },
        },
      }),
    } as unknown as RequestHandlerContext;

    const result = await assertWorkflowsEnabled({ context, response });

    expect(result).not.toBeNull();
    expect(response.notFound).toHaveBeenCalled();
  });

  it('returns null when FF is on and per-space setting is on', async () => {
    const context = createMockContext(true, true);

    const result = await assertWorkflowsEnabled({ context, response });

    expect(result).toBeNull();
  });

  it('returns a 404 response when FF is on but per-space setting is off', async () => {
    const context = createMockContext(true, false);

    const result = await assertWorkflowsEnabled({ context, response });

    expect(result).not.toBeNull();
    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: 'Attack Discovery workflows are not enabled' },
    });
  });
});
