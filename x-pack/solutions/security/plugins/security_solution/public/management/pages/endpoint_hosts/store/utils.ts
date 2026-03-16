/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImmutableObject } from '../../../../../common/endpoint/types';
import { HostPolicyResponseActionStatus } from '../../../../../common/endpoint/types';

interface AppliedPolicyConfiguration {
  concerned_actions: string[];
}

interface AppliedPolicyResponse {
  configurations?: Record<string, AppliedPolicyConfiguration>;
}

interface AppliedPolicyAction {
  name: string;
  status?: HostPolicyResponseActionStatus;
}

type AppliedPolicy = ImmutableObject<{
  response?: AppliedPolicyResponse;
  actions?: AppliedPolicyAction[];
}>;

export const getFailedOrWarningActionCountFromPolicyResponse = (
  applied: AppliedPolicy | undefined
): Map<string, number> => {
  const failureOrWarningByConfigType = new Map<string, number>();
  if (applied?.response?.configurations !== undefined && applied?.actions !== undefined) {
    const actions = applied.actions;
    Object.entries(applied.response.configurations).map(([key, val]) => {
      let count = 0;
      for (const action of val.concerned_actions) {
        const actionStatus = actions.find((policyActions) => policyActions.name === action)?.status;
        if (
          actionStatus === HostPolicyResponseActionStatus.failure ||
          actionStatus === HostPolicyResponseActionStatus.warning
        ) {
          count += 1;
        }
      }
      return failureOrWarningByConfigType.set(key, count);
    });
  }
  return failureOrWarningByConfigType;
};
