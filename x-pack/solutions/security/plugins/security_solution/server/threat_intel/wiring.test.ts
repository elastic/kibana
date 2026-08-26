/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ExperimentalFeatures } from '../../common';
import { registerThreatIntelInferenceFeatures } from './inference_features';
import { registerRoutes as registerThreatIntelRoutes } from './routes';
import { ensureThreatIntelBootstrap } from './setup/bootstrap_threat_intel';
import {
  registerPromoteThreatIndicatorsTask,
  registerScrubReportContentTask,
  schedulePromoteThreatIndicatorsTask,
  scheduleScrubReportContentTask,
} from './tasks';
import { registerThreatIntelWorkflowSteps } from './workflows/step_types';
import { createThreatIntelRuntime, setupThreatIntel, startThreatIntel } from './wiring';

// Explicit factories rather than automock: these are barrels, and automock does not
// reliably produce callables for their re-exports.
jest.mock('./inference_features', () => ({
  registerThreatIntelInferenceFeatures: jest.fn(),
}));
jest.mock('./routes', () => ({ registerRoutes: jest.fn() }));
jest.mock('./setup/bootstrap_threat_intel', () => ({ ensureThreatIntelBootstrap: jest.fn() }));
jest.mock('./tasks', () => ({
  PROMOTE_THREAT_INDICATORS_TASK_ID: 'threat_intel:promote_threat_indicators:default',
  SCRUB_REPORT_CONTENT_TASK_ID: 'threat_intel:scrub_report_content:default',
  registerPromoteThreatIndicatorsTask: jest.fn(),
  registerScrubReportContentTask: jest.fn(),
  schedulePromoteThreatIndicatorsTask: jest.fn(),
  scheduleScrubReportContentTask: jest.fn(),
}));
jest.mock('./workflows/step_types', () => ({ registerThreatIntelWorkflowSteps: jest.fn() }));

/**
 * Everything the pipeline registers. The flag-off case asserts every one of these is
 * untouched, which is the guarantee that makes the whole feature safe to ship
 * disabled: no routes, no workflow step, no inference feature, no index template, no
 * task definition, and no schedule.
 */
const ALL_REGISTRATIONS = [
  ['inference features', registerThreatIntelInferenceFeatures],
  ['routes', registerThreatIntelRoutes],
  ['workflow steps', registerThreatIntelWorkflowSteps],
  ['promote task definition', registerPromoteThreatIndicatorsTask],
  ['scrub task definition', registerScrubReportContentTask],
  ['bootstrap', ensureThreatIntelBootstrap],
  ['promote task schedule', schedulePromoteThreatIndicatorsTask],
  ['scrub task schedule', scheduleScrubReportContentTask],
] as const;

const features = (threatIntelSupplyEnabled: boolean) =>
  ({ threatIntelSupplyEnabled } as unknown as ExperimentalFeatures);

const taskManager = () =>
  ({
    registerTaskDefinitions: jest.fn(),
    removeIfExists: jest.fn().mockResolvedValue(undefined),
  } as never);

const setupDeps = () => ({ taskManager: taskManager(), workflowsExtensions: {} } as never);
const startDeps = () => ({ taskManager: taskManager() } as never);

describe('threat intel wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ensureThreatIntelBootstrap as jest.Mock).mockResolvedValue(undefined);
    (schedulePromoteThreatIndicatorsTask as jest.Mock).mockResolvedValue(undefined);
    (scheduleScrubReportContentTask as jest.Mock).mockResolvedValue(undefined);
  });

  describe('flag off', () => {
    const runBoth = () => {
      const runtime = createThreatIntelRuntime();
      const logger = loggingSystemMock.createLogger();
      setupThreatIntel({
        experimentalFeatures: features(false),
        plugins: setupDeps(),
        core: coreMock.createSetup() as never,
        logger,
        runtime,
      });
      startThreatIntel({
        experimentalFeatures: features(false),
        plugins: startDeps(),
        core: coreMock.createStart() as never,
        logger,
        runtime,
      });
      return runtime;
    };

    it.each(ALL_REGISTRATIONS)('does not register %s', (_label, collaborator) => {
      runBoth();
      expect(collaborator).not.toHaveBeenCalled();
    });

    it('creates no router', () => {
      const core = coreMock.createSetup();
      setupThreatIntel({
        experimentalFeatures: features(false),
        plugins: setupDeps(),
        core: core as never,
        logger: loggingSystemMock.createLogger(),
        runtime: createThreatIntelRuntime(),
      });
      expect(core.http.createRouter).not.toHaveBeenCalled();
    });

    it('leaves the bootstrap readiness promise resolved, so nothing awaits forever', async () => {
      const runtime = runBoth();
      await expect(runtime.bootstrapReady).resolves.toBeUndefined();
    });

    // A task scheduled during an earlier flag-on boot would otherwise sit in the Task
    // Manager index un-runnable, because its definition is only registered when the
    // flag is on.
    it('removes any task left behind by a previous flag-on boot', () => {
      const runtime = createThreatIntelRuntime();
      const plugins = startDeps() as unknown as {
        taskManager: { removeIfExists: jest.Mock };
      };
      startThreatIntel({
        experimentalFeatures: features(false),
        plugins: plugins as never,
        core: coreMock.createStart() as never,
        logger: loggingSystemMock.createLogger(),
        runtime,
      });
      expect(plugins.taskManager.removeIfExists).toHaveBeenCalledTimes(2);
    });
  });

  // Routes are registered in setup and capture `getBootstrapReady`, so a default of
  // "already resolved" would let anything reaching a handler before start sail through
  // the readiness gate and touch the indices before templates and migrations ran.
  describe('readiness gate defaults', () => {
    const setupOnly = (flagEnabled: boolean) => {
      const runtime = createThreatIntelRuntime();
      setupThreatIntel({
        experimentalFeatures: features(flagEnabled),
        plugins: setupDeps(),
        core: coreMock.createSetup() as never,
        logger: loggingSystemMock.createLogger(),
        runtime,
      });
      return runtime;
    };

    it('rejects between setup and start when the flag is on', async () => {
      await expect(setupOnly(true).bootstrapReady).rejects.toThrow(/bootstrap has not started/);
    });

    it('stays resolved when the flag is off, so nothing awaits forever', async () => {
      await expect(setupOnly(false).bootstrapReady).resolves.toBeUndefined();
    });

    it('is replaced by the real promise once start runs', async () => {
      const runtime = setupOnly(true);
      startThreatIntel({
        experimentalFeatures: features(true),
        plugins: startDeps(),
        core: coreMock.createStart() as never,
        logger: loggingSystemMock.createLogger(),
        runtime,
      });

      await expect(runtime.bootstrapReady).resolves.toBeUndefined();
    });
  });

  describe('flag on', () => {
    // The mirror of the flag-off case: if these stopped being called the flag-off
    // assertions above would pass trivially and prove nothing.
    it.each([
      ['inference features', registerThreatIntelInferenceFeatures],
      ['routes', registerThreatIntelRoutes],
      ['workflow steps', registerThreatIntelWorkflowSteps],
      ['promote task definition', registerPromoteThreatIndicatorsTask],
      ['scrub task definition', registerScrubReportContentTask],
    ] as const)('registers %s', (_label, collaborator) => {
      setupThreatIntel({
        experimentalFeatures: features(true),
        plugins: setupDeps(),
        core: coreMock.createSetup() as never,
        logger: loggingSystemMock.createLogger(),
        runtime: createThreatIntelRuntime(),
      });
      expect(collaborator).toHaveBeenCalled();
    });

    it('runs bootstrap and schedules both tasks on start', async () => {
      const runtime = createThreatIntelRuntime();
      startThreatIntel({
        experimentalFeatures: features(true),
        plugins: startDeps(),
        core: coreMock.createStart() as never,
        logger: loggingSystemMock.createLogger(),
        runtime,
      });

      expect(ensureThreatIntelBootstrap).toHaveBeenCalled();
      await runtime.bootstrapReady;
      await new Promise(process.nextTick);
      expect(schedulePromoteThreatIndicatorsTask).toHaveBeenCalled();
      expect(scheduleScrubReportContentTask).toHaveBeenCalled();
    });

    // Scheduling is gated on bootstrap: the tasks read and write the same indices, so
    // a failed bootstrap means there is no schema for them to work against.
    it('does not schedule tasks when bootstrap fails', async () => {
      (ensureThreatIntelBootstrap as jest.Mock).mockRejectedValue(new Error('no cluster'));
      const runtime = createThreatIntelRuntime();

      startThreatIntel({
        experimentalFeatures: features(true),
        plugins: startDeps(),
        core: coreMock.createStart() as never,
        logger: loggingSystemMock.createLogger(),
        runtime,
      });

      await runtime.bootstrapReady.catch(() => undefined);
      await new Promise(process.nextTick);
      expect(schedulePromoteThreatIndicatorsTask).not.toHaveBeenCalled();
      expect(scheduleScrubReportContentTask).not.toHaveBeenCalled();
    });
  });
});
