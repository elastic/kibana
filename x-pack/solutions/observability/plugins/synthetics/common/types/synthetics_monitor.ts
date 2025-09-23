/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceLocationErrors } from '../runtime_types';

export interface TestNowResponse {
  errors?: ServiceLocationErrors;
  testRunId: string;
}

export interface AgentPolicyInfo {
  id: string;
  name: string;
  agents: number;
  status: string;
  description?: string;
  namespace?: string;
}
