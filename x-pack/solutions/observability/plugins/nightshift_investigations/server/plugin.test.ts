/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import type { InvestigationQuotaCallback, NightshiftInvestigationsSetupDeps } from './types';
import { NightshiftInvestigationsPlugin } from './plugin';
import { investigationManagementSkill } from './agent_builder/skills/investigation_management';

const createPlugin = () =>
  new NightshiftInvestigationsPlugin(
    coreMock.createPluginInitializerContext({
      enabled: true,
      sandbox: undefined,
      cortex: { enabled: false },
      decision_trees: { enabled: true },
    })
  );

const createSetupDeps = () =>
  ({
    taskManager: {
      registerTaskDefinitions: jest.fn(),
    },
  } as unknown as NightshiftInvestigationsSetupDeps);

describe('NightshiftInvestigationsPlugin setup', () => {
  it('accepts one investigation quota callback', () => {
    const setup = createPlugin().setup(coreMock.createSetup(), createSetupDeps());
    const callback: InvestigationQuotaCallback = jest.fn().mockResolvedValue({ allowed: true });

    expect(() => setup.registerInvestigationQuota(callback)).not.toThrow();
  });

  it('rejects a second investigation quota callback registration', () => {
    const setup = createPlugin().setup(coreMock.createSetup(), createSetupDeps());
    const callback: InvestigationQuotaCallback = jest.fn().mockResolvedValue({ allowed: true });

    setup.registerInvestigationQuota(callback);

    expect(() => setup.registerInvestigationQuota(callback)).toThrow(
      'Investigation quota callback is already registered'
    );
  });
});

describe('NightshiftInvestigationsPlugin start', () => {
  it('registers investigationManagementSkill with availability when agentBuilder is present', () => {
    const plugin = createPlugin();
    const coreStart = coreMock.createStart();
    const agentBuilder = {
      skills: {
        register: jest.fn().mockResolvedValue(undefined),
      },
    };
    plugin.start(coreStart, {
      agentBuilder,
    } as never);

    expect(agentBuilder.skills.register).toHaveBeenCalledWith(
      expect.objectContaining({
        id: investigationManagementSkill.id,
        name: investigationManagementSkill.name,
        availability: expect.any(Object),
      })
    );
  });
});
