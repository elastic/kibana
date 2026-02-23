/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';

export interface AgentSkillsDemoContext {
  kbnClient: KbnClient;
  log: ToolingLog;
  /**
   * If a VM was created/enrolled, this contains the VM name (multipass instance name).
   */
  vmName?: string;
  /**
   * Fleet Agent Policy id used for enrollment.
   */
  agentPolicyId: string;
}

export interface AgentSkillsDemoScenario {
  id: string;
  title: string;
  description: string;
  run: (ctx: AgentSkillsDemoContext) => Promise<void>;
}


