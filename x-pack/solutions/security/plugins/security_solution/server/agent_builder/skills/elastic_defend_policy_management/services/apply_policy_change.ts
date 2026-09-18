/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, KibanaRequest, StartServicesAccessor } from '@kbn/core/server';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { FLEET_ENDPOINT_PACKAGE } from '@kbn/fleet-plugin/common';
import { z } from '@kbn/zod/v4';
import { getPolicyDataForUpdate } from '../../../../../common/endpoint/service/policy';
import { ENDPOINT_POLICY_WRITE_REQUIRED_AUTHZ } from '../../../../../common/endpoint/service/authz';
import type { NewPolicyData, PolicyData } from '../../../../../common/endpoint/types';
import type { EndpointAppContextService } from '../../../../endpoint/endpoint_app_context_services';
import { diffPolicyConfig } from '../domain/diff_policy_config';
import type { PolicyDiffEntry } from '../domain/diff_policy_config';
import { createEndpointPolicySnapshot } from '../domain/endpoint_policy_snapshot';
import {
  POLICY_CHANGE_PREPARATION_ERROR_CODE,
  POLICY_CHANGE_SCHEMA_MESSAGE,
  PolicyChangePreparationError,
  assertParameterBounds,
  buildPolicyChangeAssessment,
  parseAssessPolicyChangeParams,
} from '../domain/impact';
import type { PolicyChangeAssessment } from '../domain/impact';
import { POLICY_IDENTIFIER_MAX_LENGTH } from '../domain/input_schemas';
import { normalize } from '../domain/normalize_policy_config';
import { normalizeEndpointPolicy } from '../domain/normalized_endpoint_policy';
import type { NormalizedEndpointPolicy } from '../domain/normalized_endpoint_policy';
import { createPolicyAccessContext } from './access_context';
import type { PolicyWriteAccessContext } from './access_context';
import type { EndpointCountResult } from './count_endpoints';
import { countEndpoints } from './count_endpoints';
import { toPolicyChangeCapabilities } from './policy_change_capabilities';
import {
  InvalidEndpointPolicyError,
  PolicyBlockedChangeError,
  PolicyNoChangeError,
  PolicyVersionConflictError,
  PolicyWriteRejectedError,
  PolicyWriteUnverifiedError,
} from './policy_errors';
import type { PolicyWriteIdentity } from './policy_errors';
import { getPackagePolicyById, uniqueAgentPolicyIds } from './policy_lookup';
import { ensureResolvedInCurrentSpace, getNormalizedEndpointPolicy } from './read_policy';

export type ApplyPolicyCallSource = 'agent' | 'user' | 'mcp' | 'unknown';

export interface ApplyPolicyChangeDependencies {
  readonly endpointAppContextService: EndpointAppContextService;
  readonly getStartServices: StartServicesAccessor;
  readonly request: KibanaRequest;
  readonly spaceId: string;
}

export type ApplyPolicyChangeParams = Readonly<{
  idOrName: string;
  changes: ReturnType<typeof parseAssessPolicyChangeParams>['changes'];
  expectedVersion: string;
}>;

export type ApplyPolicyChangePreview = Readonly<{
  policy: PolicyWriteIdentity;
  agentPolicyCount: number;
  assessment: PolicyChangeAssessment;
  enrollment: EndpointCountResult;
}>;

export type PreparedApplyPolicyChange = ApplyPolicyChangePreview & {
  readonly access: PolicyWriteAccessContext;
  readonly user: AuthenticatedUser;
  readonly expectedVersion: string;
};

export type ApplyPolicyChangeResult = Readonly<{
  before: PolicyWriteIdentity;
  after: PolicyWriteIdentity;
  requestedChanges: PolicyChangeAssessment['changes'];
  sideEffects: PolicyChangeAssessment['sideEffects'];
  residual: readonly PolicyDiffEntry[];
  enrollment: EndpointCountResult;
}>;

const isParamsRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const expectedVersionInputSchema = z.string().min(1).max(POLICY_IDENTIFIER_MAX_LENGTH);

const parseExpectedVersion = (value: unknown): string => {
  const parsed = expectedVersionInputSchema.safeParse(value);
  if (!parsed.success) {
    throw new PolicyChangePreparationError(
      POLICY_CHANGE_PREPARATION_ERROR_CODE.invalid_input,
      POLICY_CHANGE_SCHEMA_MESSAGE
    );
  }
  return parsed.data;
};

const parseApplyPolicyChangeParams = (rawParams: unknown): ApplyPolicyChangeParams => {
  if (!isParamsRecord(rawParams)) {
    throw new PolicyChangePreparationError(
      POLICY_CHANGE_PREPARATION_ERROR_CODE.invalid_input,
      POLICY_CHANGE_SCHEMA_MESSAGE
    );
  }

  const { expectedVersion, ...assessParams } = rawParams;
  return {
    ...parseAssessPolicyChangeParams(assessParams),
    expectedVersion: parseExpectedVersion(expectedVersion),
  };
};

const toIdentityPick = (identity: PolicyWriteIdentity): PolicyWriteIdentity => ({
  id: identity.id,
  name: identity.name,
  revision: identity.revision,
  version: identity.version,
});

const toUsableNormalizedPolicy = (
  returned: PackagePolicy | null | undefined
): NormalizedEndpointPolicy | undefined => {
  if (returned == null || returned.package?.name !== FLEET_ENDPOINT_PACKAGE) {
    return undefined;
  }

  try {
    return normalizeEndpointPolicy(createEndpointPolicySnapshot(returned));
  } catch {
    return undefined;
  }
};

const observePolicyIdentity = async (
  access: PolicyWriteAccessContext,
  policyId: string
): Promise<PolicyWriteIdentity | undefined> => {
  try {
    const observed = await getPackagePolicyById(access, policyId);
    if (observed == null || observed.package?.name !== FLEET_ENDPOINT_PACKAGE) {
      return undefined;
    }

    await ensureResolvedInCurrentSpace(access, observed.id);
    const normalized = normalizeEndpointPolicy(createEndpointPolicySnapshot(observed));
    return toIdentityPick(normalized.snapshot.identity);
  } catch {
    return undefined;
  }
};

const currentUser = (
  endpointAppContextService: EndpointAppContextService,
  request: KibanaRequest
): AuthenticatedUser | null =>
  endpointAppContextService.security?.authc.getCurrentUser(request) ?? null;

const assertEligibleAssessment = (assessment: PolicyChangeAssessment): void => {
  if (
    assessment.globalBlockers.length > 0 ||
    assessment.changes.some((change) => !change.eligibility.eligible)
  ) {
    throw new PolicyBlockedChangeError();
  }

  if (assessment.normalizedDiff.length === 0) {
    throw new PolicyNoChangeError();
  }
};

const throwWriteUnverified = async (
  access: PolicyWriteAccessContext,
  before: PolicyWriteIdentity,
  policyId: string
): Promise<never> => {
  const observed = await observePolicyIdentity(access, policyId);
  throw new PolicyWriteUnverifiedError(before, observed);
};

export const prepareApplyPolicyChange = async (
  deps: ApplyPolicyChangeDependencies,
  rawParams: unknown,
  options?: Readonly<{ callSource?: ApplyPolicyCallSource }>
): Promise<PreparedApplyPolicyChange> => {
  const { endpointAppContextService, getStartServices, request, spaceId } = deps;
  assertParameterBounds(rawParams);
  const params = parseApplyPolicyChangeParams(rawParams);

  if (options?.callSource !== undefined && options.callSource !== 'agent') {
    throw new PolicyWriteRejectedError();
  }

  const access = await createPolicyAccessContext(
    endpointAppContextService,
    { request, spaceId },
    ENDPOINT_POLICY_WRITE_REQUIRED_AUTHZ,
    getStartServices,
    'write'
  );
  const user = currentUser(endpointAppContextService, request);
  if (user == null) {
    throw new PolicyWriteRejectedError();
  }

  const policy = await getNormalizedEndpointPolicy(access, { idOrName: params.idOrName });
  if (policy.snapshot.identity.version !== params.expectedVersion) {
    throw new PolicyVersionConflictError();
  }

  const assessment = buildPolicyChangeAssessment(
    policy,
    params.changes,
    toPolicyChangeCapabilities(endpointAppContextService)
  );
  assertEligibleAssessment(assessment);

  const enrollment = await countEndpoints(access, {
    agentPolicyIds: policy.snapshot.agentPolicyIds,
  });

  return {
    access,
    user,
    expectedVersion: params.expectedVersion,
    policy: toIdentityPick(policy.snapshot.identity),
    agentPolicyCount: uniqueAgentPolicyIds(policy.snapshot.agentPolicyIds).length,
    assessment,
    enrollment,
  };
};

export const previewApplyPolicyChange = async (
  deps: ApplyPolicyChangeDependencies,
  rawParams: unknown
): Promise<ApplyPolicyChangePreview> => {
  const prepared = await prepareApplyPolicyChange(deps, rawParams);
  return {
    policy: prepared.policy,
    agentPolicyCount: prepared.agentPolicyCount,
    assessment: prepared.assessment,
    enrollment: prepared.enrollment,
  };
};

const persistPreparedApply = async (
  prepared: PreparedApplyPolicyChange
): Promise<ApplyPolicyChangeResult> => {
  const { access, user, assessment, enrollment, policy, expectedVersion } = prepared;
  const snapshot = assessment.policy.snapshot;
  const policyId = snapshot.identity.id;

  const soClient = access.fleet.getSoClient();
  const esClient = access.getInternalEsClient();

  let payload: NewPolicyData;
  try {
    payload = getPolicyDataForUpdate(snapshot.source as PolicyData);
    payload.inputs[0].config.policy.value = structuredClone(assessment.proposedConfig);
    payload.version = expectedVersion;
  } catch {
    throw new InvalidEndpointPolicyError();
  }

  let returned: PackagePolicy;
  try {
    returned = await access.fleet.packagePolicy.update(soClient, esClient, policyId, payload, {
      user,
    });
  } catch {
    return throwWriteUnverified(access, policy, policyId);
  }

  const usable = toUsableNormalizedPolicy(returned);
  if (usable === undefined) {
    return throwWriteUnverified(access, policy, policyId);
  }

  return {
    before: policy,
    after: toIdentityPick(usable.snapshot.identity),
    requestedChanges: assessment.changes,
    sideEffects: assessment.sideEffects,
    residual: diffPolicyConfig(normalize(assessment.proposedConfig), usable.normalizedConfig),
    enrollment,
  };
};

export const applyPolicyChange = async (
  deps: ApplyPolicyChangeDependencies,
  rawParams: unknown,
  input: Readonly<{ callSource: ApplyPolicyCallSource }>
): Promise<ApplyPolicyChangeResult> => {
  const prepared = await prepareApplyPolicyChange(deps, rawParams, {
    callSource: input.callSource,
  });
  return persistPreparedApply(prepared);
};
