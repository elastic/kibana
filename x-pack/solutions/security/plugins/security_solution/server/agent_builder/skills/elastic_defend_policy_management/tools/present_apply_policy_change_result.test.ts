/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { FleetPackagePolicyGenerator } from '../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import { policyFactory } from '../../../../../common/endpoint/models/policy_config';
import { AdvancedPolicySchema } from '../../../../../common/endpoint/service/policy/advanced_policy_schema';
import { ProtectionModes, type PolicyConfig } from '../../../../../common/endpoint/types';
import { createEndpointPolicySnapshot } from '../domain/endpoint_policy_snapshot';
import { normalizeEndpointPolicy } from '../domain/normalized_endpoint_policy';
import { diffPolicyConfig } from '../domain/diff_policy_config';
import { normalize } from '../domain/normalize_policy_config';
import { buildPolicyChangeAssessment } from '../domain/impact';
import type { PolicyChangeCapabilities, PolicyChangeOperation } from '../domain/impact';
import type { EndpointCountResult } from '../services/count_endpoints';
import { presentApplyPolicyChangeResult } from './present_apply_policy_change_result';
import {
  DEFAULT_TRIM_LIMITS,
  estimateGuardedEnvelopeTokens,
  fitsGuardedEnvelope,
  GUARDED_ENVELOPE_HEADROOM_TOKENS,
  presentFromTo,
} from './trim_policy_result';

const generator = new FleetPackagePolicyGenerator();
const APPLY_POLICY_CHANGE_MAX_RESULT_TOKENS = 12_000;
const WINDOWS_ADVANCED_PREFIX = 'windows.advanced.';
const ADVANCED_STRING_VALUE = 'a'.repeat(512);

const capabilities = (): PolicyChangeCapabilities => ({
  licenseInformation: licenseMock.createLicense({ license: { type: 'enterprise' } }),
  endpointPolicyProtections: true,
  endpointTrustedDevices: true,
  trustedDevicesExperimental: true,
  endpointProtectionUpdates: true,
  endpointCustomNotification: true,
  serverless: false,
});

const createNormalizedPolicy = (stored: PolicyConfig) => {
  const packagePolicy = generator.generateEndpointPackagePolicy({
    id: 'policy-1',
    name: 'Endpoint Policy',
    version: 'WzEsMV0=',
    policy_ids: ['agent-policy-a'],
  });
  const entry = packagePolicy.inputs[0]?.config?.policy;
  if (entry == null) {
    throw new Error('expected generated endpoint package policy to include config.policy');
  }
  entry.value = stored;
  return normalizeEndpointPolicy(createEndpointPolicySnapshot(packagePolicy));
};

const ENROLLMENT: EndpointCountResult = {
  population: 'enrolled_agents',
  source: 'fleet_status_aggregation',
  status: { all: 3 },
};

const setPolicyPathValue = (
  policy: Record<string, unknown>,
  value: string,
  path: readonly string[]
): void => {
  let cursor = policy;
  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i];
    if (segment === undefined) {
      throw new Error('expected advanced schema path segment');
    }
    if (cursor[segment] == null || typeof cursor[segment] !== 'object') {
      cursor[segment] = {};
    }
    cursor = cursor[segment] as Record<string, unknown>;
  }
  const leaf = path[path.length - 1];
  if (leaf === undefined) {
    throw new Error('expected advanced schema leaf');
  }
  cursor[leaf] = value;
};

const createResult = (operations: readonly PolicyChangeOperation[]) => {
  const normalized = createNormalizedPolicy(policyFactory());
  const assessment = buildPolicyChangeAssessment(normalized, operations, capabilities());
  const identity = {
    id: normalized.snapshot.identity.id,
    name: normalized.snapshot.identity.name,
    revision: normalized.snapshot.identity.revision,
    version: normalized.snapshot.identity.version,
  };

  return {
    assessment,
    result: {
      before: identity,
      after: {
        ...identity,
        revision: identity.revision + 1,
        version: 'WzIsMV0=',
      },
      requestedChanges: assessment.changes,
      sideEffects: assessment.sideEffects,
      residual: [],
      enrollment: ENROLLMENT,
    },
  };
};

const createResidualResult = () => {
  const current = policyFactory();
  current.linux.advanced = { ...(current.linux.advanced ?? {}), removedByReturn: 'proposal' };
  current.windows.advanced = { ...(current.windows.advanced ?? {}), retained: 'proposal' };
  const normalized = createNormalizedPolicy(current);
  const assessment = buildPolicyChangeAssessment(
    normalized,
    [{ op: 'set_protection_level', protection: 'malware', mode: ProtectionModes.detect }],
    capabilities()
  );
  const returned = structuredClone(assessment.proposedConfig);
  delete (returned.linux.advanced as Record<string, unknown> | undefined)?.removedByReturn;
  returned.windows.advanced = {
    ...(returned.windows.advanced ?? {}),
    addedByReturn: 'intervening-change',
  };
  const returnedNormalized = createNormalizedPolicy(returned);
  const identity = {
    id: normalized.snapshot.identity.id,
    name: normalized.snapshot.identity.name,
    revision: normalized.snapshot.identity.revision,
    version: normalized.snapshot.identity.version,
  };

  return {
    before: identity,
    after: { ...identity, revision: identity.revision + 1, version: 'WzIsMV0=' },
    requestedChanges: assessment.changes,
    sideEffects: assessment.sideEffects,
    residual: diffPolicyConfig(assessment.proposed, normalize(returnedNormalized.normalizedConfig)),
    enrollment: ENROLLMENT,
  };
};

const createOversizedWindowsAdvancedResidualResult = () => {
  const normalized = createNormalizedPolicy(policyFactory());
  const assessment = buildPolicyChangeAssessment(
    normalized,
    [{ op: 'set_protection_level', protection: 'malware', mode: ProtectionModes.detect }],
    capabilities()
  );
  if (assessment.proposedConfig.windows.advanced !== undefined) {
    throw new Error('expected assessed proposal to omit windows.advanced');
  }

  const returned = structuredClone(assessment.proposedConfig);
  const windowsAdvancedKeys = AdvancedPolicySchema.filter(({ key }) =>
    key.startsWith(WINDOWS_ADVANCED_PREFIX)
  ).map(({ key }) => key);
  for (const key of windowsAdvancedKeys) {
    setPolicyPathValue(
      returned as unknown as Record<string, unknown>,
      ADVANCED_STRING_VALUE,
      key.split('.')
    );
  }

  const returnedNormalized = createNormalizedPolicy(returned);
  const residual = diffPolicyConfig(
    normalize(assessment.proposedConfig),
    returnedNormalized.normalizedConfig
  );
  const identity = {
    id: normalized.snapshot.identity.id,
    name: normalized.snapshot.identity.name,
    revision: normalized.snapshot.identity.revision,
    version: normalized.snapshot.identity.version,
  };

  return {
    assessment,
    residual,
    result: {
      before: identity,
      after: {
        ...identity,
        revision: identity.revision + 1,
        version: 'WzIsMV0=',
      },
      requestedChanges: assessment.changes,
      sideEffects: assessment.sideEffects,
      residual,
      enrollment: ENROLLMENT,
    },
  };
};

const presentResidualWithNulls = (
  entry: Readonly<{ path: string; from: unknown; to: unknown }>
) => {
  const presented = presentFromTo(entry, DEFAULT_TRIM_LIMITS);
  return {
    path: entry.path,
    ...presented,
    from: presented.from === undefined ? null : presented.from,
    to: presented.to === undefined ? null : presented.to,
  };
};

describe('presentApplyPolicyChangeResult', () => {
  it('serializes absent sides as null for normalized returned-policy residuals', () => {
    const result = createResidualResult();
    const presented = presentApplyPolicyChangeResult(result);

    expect(presented.residual).toEqual([
      { path: 'windows.advanced.addedByReturn', from: null, to: 'intervening-change' },
      { path: 'linux.advanced.removedByReturn', from: 'proposal', to: null },
    ]);
    expect(JSON.parse(JSON.stringify(presented.residual))).toEqual(presented.residual);
    expect(presented).not.toHaveProperty('residual_value_truncated');
  });
  it('preserves bounded identities and complete success sections from a reachable assessment', () => {
    const { result, assessment } = createResult([
      { op: 'set_protection_level', protection: 'malware', mode: ProtectionModes.detect },
    ]);

    const presented = presentApplyPolicyChangeResult(result);
    const firstChange = assessment.changes[0];
    const firstPresented = presented.requestedChanges[0];
    const firstSideEffect = assessment.sideEffects[0];

    if (
      firstChange === undefined ||
      firstPresented === undefined ||
      firstSideEffect === undefined
    ) {
      throw new Error(
        'expected a reachable assessment to include requested changes and side effects'
      );
    }

    expect(presented.before).toEqual({
      id: result.before.id,
      name: result.before.name,
      revision: result.before.revision,
      version: result.before.version,
    });
    expect(presented.after).toEqual({
      id: result.after.id,
      name: result.after.name,
      revision: result.after.revision,
      version: result.after.version,
    });
    expect(presented.enrollment).toEqual(ENROLLMENT);
    expect(presented.requestedChanges).toHaveLength(assessment.changes.length);
    expect(firstPresented).toEqual(
      expect.objectContaining({
        path: firstChange.path,
        originKind: firstChange.origin.kind,
        registryKind: firstChange.registry.kind,
        eligibility: firstChange.eligibility,
        from: firstChange.from,
        to: firstChange.to,
      })
    );
    expect(firstPresented).not.toHaveProperty('registry');
    expect(presented.sideEffects).toHaveLength(assessment.sideEffects.length);
    expect(presented.sideEffects[0]).toEqual(
      expect.objectContaining({
        path: firstSideEffect.path,
        reason: 'derived_field_update',
        registryKind: firstSideEffect.registry.kind,
      })
    );
    expect(presented.residual).toEqual([]);
    expect(presented).not.toHaveProperty('side_effects_value_truncated');
    expect(presented).not.toHaveProperty('requested_changes_value_truncated');
    expect(presented).not.toHaveProperty('residual_value_truncated');
  });
  it('drops an oversized schema-backed windows.advanced residual that misses the guarded envelope', () => {
    const { assessment, residual, result } = createOversizedWindowsAdvancedResidualResult();
    const residualEntry = residual[0];
    if (residualEntry === undefined) {
      throw new Error('expected a windows.advanced residual row from the schema-backed return');
    }
    expect(residual).toHaveLength(1);
    expect(residualEntry.path).toBe('windows.advanced');

    const presentedWithoutResidual = presentApplyPolicyChangeResult({ ...result, residual: [] });
    const fullCandidate = {
      ...presentedWithoutResidual,
      residual: [presentResidualWithNulls(residualEntry)],
    };
    const fullCandidateTokens = estimateGuardedEnvelopeTokens(fullCandidate);
    expect(fitsGuardedEnvelope(fullCandidate, APPLY_POLICY_CHANGE_MAX_RESULT_TOKENS)).toBe(false);
    expect(fullCandidateTokens + GUARDED_ENVELOPE_HEADROOM_TOKENS).toBeGreaterThan(
      APPLY_POLICY_CHANGE_MAX_RESULT_TOKENS
    );

    const presented = presentApplyPolicyChangeResult(result);
    const presentedTokens = estimateGuardedEnvelopeTokens(presented);

    expect(fitsGuardedEnvelope(presented, APPLY_POLICY_CHANGE_MAX_RESULT_TOKENS)).toBe(true);
    expect(presentedTokens).toBeLessThanOrEqual(APPLY_POLICY_CHANGE_MAX_RESULT_TOKENS);
    expect(presented.before).toEqual({
      id: result.before.id,
      name: result.before.name,
      revision: result.before.revision,
      version: result.before.version,
    });
    expect(presented.after).toEqual({
      id: result.after.id,
      name: result.after.name,
      revision: result.after.revision,
      version: result.after.version,
    });
    expect(presented.enrollment).toEqual(ENROLLMENT);
    expect(presented.residual).toEqual([]);
    expect(presented.residual_value_truncated).toBe(true);
    expect(presented.residual_value_total).toBe(residual.length);
    expect(presented.requestedChanges).toEqual([]);
    expect(presented.requested_changes_value_truncated).toBe(true);
    expect(presented.requested_changes_value_total).toBe(assessment.changes.length);
    expect(presented.sideEffects).toEqual([]);
    expect(presented.side_effects_value_truncated).toBe(true);
    expect(presented.side_effects_value_total).toBe(assessment.sideEffects.length);
  });
});
