/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent } from '@kbn/fleet-plugin/common';
import { removeVersionSuffixFromPolicyId } from '@kbn/fleet-plugin/common/services/version_specific_policies_utils';

export const isInElasticDefendAgentPolicy = (
  agent: Pick<Agent, 'policy_id'>,
  endpointAgentPolicyIds: ReadonlySet<string>
): boolean =>
  agent.policy_id !== undefined &&
  endpointAgentPolicyIds.has(removeVersionSuffixFromPolicyId(agent.policy_id));
