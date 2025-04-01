/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentPolicyInfo } from '../../../../../common/types';
import { createAsyncAction } from '../utils/actions';

export const getAgentPoliciesAction = createAsyncAction<void, AgentPolicyInfo[]>(
  '[AGENT POLICIES] GET'
);
