/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Step 8.1 — plugin-level registration tests.
 *
 * These tests verify that SecurityDetectionsPlugin.setup() wires correctly to
 * the alertingVTwo setup contract depending on the feature flag.
 *
 * The "create a rule" half of the done-criteria is covered by
 * x-pack/platform/plugins/shared/alerting_v2/server/saved_objects/model_versions/detection_rule_create.test.ts,
 * which uses the framework's real BuilderTypeRegistry and RulesClient harness.
 *
 * Ref: implementation-plan.md "Step 8.1: plugin skeleton and type registration"
 */

import { coreMock } from '@kbn/core/server/mocks';
import { SecurityDetectionsPlugin } from '../plugin';
import type { ConfigType } from '../config';
import { configSchema } from '../config';
import { registerCrudRoutes } from '../routes/crud_routes';
import { registerDetectionFetchRoutes } from '../routes/fetch';
import { registerDetectionActionRoutes } from '../routes/action';

// Mock all route-registration modules so setup() does not attempt real
// Kibana router calls and so tests can assert call counts.
jest.mock('../routes/crud_routes', () => ({ registerCrudRoutes: jest.fn() }));
jest.mock('../routes/fetch', () => ({ registerDetectionFetchRoutes: jest.fn() }));
jest.mock('../routes/action', () => ({ registerDetectionActionRoutes: jest.fn() }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInitializerContext(configOverride: Partial<ConfigType> = {}) {
  const parsed = configSchema.validate({ ...configOverride });
  return coreMock.createPluginInitializerContext<ConfigType>(parsed);
}

function makeAlertingVTwoSetupMock() {
  return {
    registerBuilderType: jest.fn(),
    registerArtifactType: jest.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SecurityDetectionsPlugin — builder type registration', () => {
  describe('with the feature flag enabled (enableDetectionsOnV2: true)', () => {
    let plugin: SecurityDetectionsPlugin;
    let alertingVTwo: ReturnType<typeof makeAlertingVTwoSetupMock>;

    beforeEach(() => {
      const initializerContext = makeInitializerContext({ enableDetectionsOnV2: true });
      plugin = new SecurityDetectionsPlugin(initializerContext);
      alertingVTwo = makeAlertingVTwoSetupMock();
      plugin.setup(coreMock.createSetup(), { alertingVTwo } as never);
    });

    it('calls registerBuilderType twice (once per detection type)', () => {
      expect(alertingVTwo.registerBuilderType).toHaveBeenCalledTimes(2);
    });

    it('registers security.detection.query', () => {
      const registeredTypes = alertingVTwo.registerBuilderType.mock.calls.map(
        ([def]: [{ type: string }]) => def.type
      );
      expect(registeredTypes).toContain('security.detection.query');
    });

    it('registers security.detection.threshold', () => {
      const registeredTypes = alertingVTwo.registerBuilderType.mock.calls.map(
        ([def]: [{ type: string }]) => def.type
      );
      expect(registeredTypes).toContain('security.detection.threshold');
    });

    it('exposes detectionsEnabled = true', () => {
      expect(plugin.detectionsEnabled).toBe(true);
    });
  });

  describe('with the feature flag disabled (default: enableDetectionsOnV2: false)', () => {
    let plugin: SecurityDetectionsPlugin;
    let alertingVTwo: ReturnType<typeof makeAlertingVTwoSetupMock>;

    beforeEach(() => {
      // Default config has enableDetectionsOnV2: false.
      const initializerContext = makeInitializerContext();
      plugin = new SecurityDetectionsPlugin(initializerContext);
      alertingVTwo = makeAlertingVTwoSetupMock();
      plugin.setup(coreMock.createSetup(), { alertingVTwo } as never);
    });

    it('does not call registerBuilderType at all', () => {
      expect(alertingVTwo.registerBuilderType).not.toHaveBeenCalled();
    });

    it('exposes detectionsEnabled = false', () => {
      expect(plugin.detectionsEnabled).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Route registration gating
// ---------------------------------------------------------------------------

describe('SecurityDetectionsPlugin — route registration gating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not register CRUD, fetch, or action routes when flag is off', () => {
    const initializerContext = makeInitializerContext({ enableDetectionsOnV2: false });
    const plugin = new SecurityDetectionsPlugin(initializerContext);
    plugin.setup(coreMock.createSetup(), { alertingVTwo: makeAlertingVTwoSetupMock() } as never);

    expect(registerCrudRoutes).not.toHaveBeenCalled();
    expect(registerDetectionFetchRoutes).not.toHaveBeenCalled();
    expect(registerDetectionActionRoutes).not.toHaveBeenCalled();
  });

  it('registers CRUD, fetch, and action routes when flag is on', () => {
    const initializerContext = makeInitializerContext({ enableDetectionsOnV2: true });
    const plugin = new SecurityDetectionsPlugin(initializerContext);
    plugin.setup(coreMock.createSetup(), { alertingVTwo: makeAlertingVTwoSetupMock() } as never);

    expect(registerCrudRoutes).toHaveBeenCalledTimes(1);
    expect(registerDetectionFetchRoutes).toHaveBeenCalledTimes(1);
    expect(registerDetectionActionRoutes).toHaveBeenCalledTimes(1);
  });
});
