/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { ToolAvailabilityContext } from '@kbn/agent-builder-server/tools';
import type { ProductFeaturesService } from '../../../lib/product_features_service/product_features_service';
import { registerSiemMigrationTools } from './register_siem_migration_tools';

describe('SIEM migration tools availability handler', () => {
  let mockCore: ReturnType<typeof coreMock.createSetup>;
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;
  let mockRequest: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let mockSpacesStart: ReturnType<typeof spacesMock.createStart>;
  let mockLicense: ReturnType<typeof licensingMock.createLicense>;
  let productFeaturesService: { isEnabled: jest.Mock };
  let registeredAvailabilities: Array<{ handler: (ctx: ToolAvailabilityContext) => Promise<unknown> }>;
  let agentBuilder: { tools: { register: jest.Mock } };

  const buildAvailabilityCtx = (): ToolAvailabilityContext =>
    ({
      request: mockRequest,
      spaceId: 'default',
      uiSettings: undefined,
    } as unknown as ToolAvailabilityContext);

  beforeEach(() => {
    jest.clearAllMocks();
    mockCore = coreMock.createSetup();
    mockLogger = loggingSystemMock.createLogger();
    mockRequest = httpServerMock.createKibanaRequest();
    mockSpacesStart = spacesMock.createStart();
    // `licensingMock.createLicense` returns a real `License` instance (not a jest.Mock), so
    // `hasAtLeast` is a real method. Construct an Enterprise license so `hasAtLeast('enterprise')`
    // returns true by default; the below-enterprise test swaps in a basic license.
    mockLicense = licensingMock.createLicense({
      license: { type: 'enterprise', mode: 'enterprise' },
    });
    productFeaturesService = { isEnabled: jest.fn().mockReturnValue(true) };

    // Default: security solution space, enterprise license, PLI on.
    (mockSpacesStart.spacesService.getActiveSpace as jest.Mock).mockResolvedValue({
      id: 'default',
      solution: 'security',
    });
    (mockCore.getStartServices as jest.Mock).mockResolvedValue([
      {},
      { spaces: mockSpacesStart, licensing: { getLicense: () => mockLicense } },
      {},
    ]);

    registeredAvailabilities = [];
    agentBuilder = {
      tools: {
        register: jest.fn((def) => {
          registeredAvailabilities.push(def.availability);
        }),
      },
    } as unknown as { tools: { register: jest.Mock } };

    registerSiemMigrationTools(
      agentBuilder as unknown as AgentBuilderPluginSetup,
      mockCore,
      productFeaturesService as unknown as ProductFeaturesService,
      mockLogger
    );
  });

  it('registers an availability handler for every tool', () => {
    // 6 tools registered in PR1: get_rule_migration, start_rule_migration,
    // get_all_rule_migration_stats, get_migration_rules, get_rule_migration_stats,
    // get_rule_migration_translation_stats.
    expect(registeredAvailabilities).toHaveLength(6);
  });

  it('returns available when space, PLI, and license all pass', async () => {
    const result = await registeredAvailabilities[0].handler(buildAvailabilityCtx());
    expect(result).toEqual({ status: 'available' });
  });

  it('returns unavailable when the space solution is not allowed', async () => {
    (mockSpacesStart.spacesService.getActiveSpace as jest.Mock).mockResolvedValue({
      id: 'default',
      solution: 'oblt',
    });
    const result = (await registeredAvailabilities[0].handler(buildAvailabilityCtx())) as {
      status: string;
    };
    expect(result.status).toBe('unavailable');
  });

  it('returns unavailable when the siemMigrations PLI is off', async () => {
    productFeaturesService.isEnabled.mockReturnValue(false);
    const result = (await registeredAvailabilities[0].handler(buildAvailabilityCtx())) as {
      status: string;
      reason: string;
    };
    expect(result.status).toBe('unavailable');
    expect(result.reason).toContain('not enabled');
  });

  it('fails closed (unavailable) when productFeaturesService.isEnabled throws', async () => {
    productFeaturesService.isEnabled.mockImplementation(() => {
      throw new Error('ProductFeatures has not yet been configured');
    });
    const result = (await registeredAvailabilities[0].handler(buildAvailabilityCtx())) as {
      status: string;
      reason: string;
    };
    expect(result.status).toBe('unavailable');
    expect(result.reason).toContain('could not be determined');
  });

  it('returns unavailable when the license is below Enterprise', async () => {
    // Swap the Enterprise license for a basic one — a real License whose `hasAtLeast('enterprise')`
    // is false (no jest.Mock needed).
    const basicLicense = licensingMock.createLicense({
      license: { type: 'basic', mode: 'basic' },
    });
    (mockCore.getStartServices as jest.Mock).mockResolvedValue([
      {},
      { spaces: mockSpacesStart, licensing: { getLicense: () => basicLicense } },
      {},
    ]);
    const result = (await registeredAvailabilities[0].handler(buildAvailabilityCtx())) as {
      status: string;
      reason: string;
    };
    expect(result.status).toBe('unavailable');
    expect(result.reason).toContain('Enterprise');
  });

  it('caches per space (cacheMode is space)', () => {
    // All registered availabilities share the same shape; cacheMode is set on the availability
    // object passed to register. Verify via the register mock calls.
    for (const call of agentBuilder.tools.register.mock.calls) {
      const def = call[0] as { availability?: { cacheMode?: string } };
      expect(def.availability?.cacheMode).toBe('space');
    }
  });
});
