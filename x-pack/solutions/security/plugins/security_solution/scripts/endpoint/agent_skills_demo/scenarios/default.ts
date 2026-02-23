/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0.
 */

import { assertDefaultScenarioPreconditions } from '../validation/default_scenario_validation';
import type { AgentSkillsDemoScenario } from '../types';

export const defaultScenario: AgentSkillsDemoScenario = {
    id: 'default',
    title: 'Default Agent Skills Demo',
    description:
        'Ensures an enrolled endpoint host is present and the agent policy includes Elastic Defend and Osquery integrations.',
    run: async (ctx) => {
        await assertDefaultScenarioPreconditions(ctx);
    },
};


