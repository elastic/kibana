/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0.
 */

import type { AgentSkillsDemoScenario } from '../types';
import { defaultScenario } from './default';
import { cortadoLateralMovementScenario } from './cortado_lateral_movement';

const scenarios: AgentSkillsDemoScenario[] = [defaultScenario, cortadoLateralMovementScenario];

export const getScenario = (scenarioId: string): AgentSkillsDemoScenario => {
  const found = scenarios.find((s) => s.id === scenarioId);
  if (!found) {
    throw new Error(
      `Unknown scenario id [${scenarioId}]. Available: ${scenarios.map((s) => s.id).join(', ')}`
    );
  }
  return found;
};

export const listScenarios = (): AgentSkillsDemoScenario[] => scenarios;
