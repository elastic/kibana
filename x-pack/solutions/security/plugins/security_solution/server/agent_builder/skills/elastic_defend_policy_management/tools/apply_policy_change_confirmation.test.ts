/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { FleetPackagePolicyGenerator } from '../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import { policyFactory } from '../../../../../common/endpoint/models/policy_config';
import { ProtectionModes } from '../../../../../common/endpoint/types';
import type { PolicyConfig } from '../../../../../common/endpoint/types';
import { createEndpointPolicySnapshot } from '../domain/endpoint_policy_snapshot';
import { normalizeEndpointPolicy } from '../domain/normalized_endpoint_policy';
import { buildPolicyChangeAssessment } from '../domain/impact';
import type { PolicyChangeCapabilities, PolicyChangeOperation } from '../domain/impact';
import type { ApplyPolicyChangePreview } from '../services/apply_policy_change';
import type { EndpointCountResult } from '../services/count_endpoints';
import {
  renderApplyPolicyChangeConfirmation,
  selectApplyPreviewFacts,
} from './apply_policy_change_confirmation';
import type { ApplyPreviewFacts } from './apply_policy_change_confirmation';

const generator = new FleetPackagePolicyGenerator();

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

const DEFAULT_ENROLLMENT: EndpointCountResult = {
  population: 'enrolled_agents',
  source: 'fleet_status_aggregation',
  status: { all: 3 },
};

const createPreview = (
  operations: readonly PolicyChangeOperation[],
  stored: PolicyConfig = policyFactory(),
  overrides: Partial<ApplyPolicyChangePreview> = {}
): ApplyPolicyChangePreview => {
  const normalized = createNormalizedPolicy(stored);
  const assessment = buildPolicyChangeAssessment(normalized, operations, capabilities());

  return {
    policy: {
      id: normalized.snapshot.identity.id,
      name: normalized.snapshot.identity.name,
      revision: normalized.snapshot.identity.revision,
      version: normalized.snapshot.identity.version,
    },
    agentPolicyCount: 1,
    assessment,
    enrollment: DEFAULT_ENROLLMENT,
    ...overrides,
  };
};

const facts = (overrides: Partial<ApplyPreviewFacts> = {}): ApplyPreviewFacts => ({
  policyName: 'Endpoint Policy',
  policyRevision: 3,
  policyVersion: 'WzEsMV0=',
  changeTotal: 2,
  directRows: [],
  coupledRows: [],
  sideEffects: [],
  blastRadius: { agentPolicyCount: 2, enrollment: DEFAULT_ENROLLMENT },
  ...overrides,
});

describe('selectApplyPreviewFacts', () => {
  it('partitions real preview changes by origin kind and carries identity, side effects, and blast radius', () => {
    const preview = createPreview([
      { op: 'set_protection_level', protection: 'malware', mode: ProtectionModes.detect },
    ]);

    const selected = selectApplyPreviewFacts(preview);

    expect(preview.assessment.changes.length).toBeGreaterThan(0);
    expect(selected.changeTotal).toBe(preview.assessment.changes.length);
    expect(selected.directRows.length + selected.coupledRows.length).toBe(
      preview.assessment.changes.length
    );
    expect(selected.directRows.every((row) => row.originKind === 'direct')).toBe(true);
    expect(selected.coupledRows.every((row) => row.originKind === 'coupled')).toBe(true);
    expect(selected.coupledRows.length).toBeGreaterThan(0);
    expect(selected.sideEffects).toEqual(
      preview.assessment.sideEffects.map((sideEffect) => ({
        path: sideEffect.path,
        from: sideEffect.from,
        to: sideEffect.to,
      }))
    );
    expect(selected.policyName).toBe('Endpoint Policy');
    expect(selected.policyVersion).toBe('WzEsMV0=');
    expect(selected.blastRadius).toEqual({ agentPolicyCount: 1, enrollment: DEFAULT_ENROLLMENT });
  });
});

describe('renderApplyPolicyChangeConfirmation', () => {
  it('renders warning card fields, GFM header, every direct-then-coupled row, side effects, blast radius, and checked identity', () => {
    const stored = policyFactory();
    delete (stored.mac.popup.malware as { enabled?: boolean }).enabled;
    const preview = createPreview(
      [{ op: 'set_protection_level', protection: 'malware', mode: ProtectionModes.detect }],
      stored
    );
    expect(preview.assessment.globalBlockers).toEqual([]);
    expect(preview.assessment.changes.every(({ eligibility }) => eligibility.eligible)).toBe(true);
    expect(preview.assessment.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'mac.popup.malware.enabled',
          from: undefined,
          to: false,
          origin: expect.objectContaining({ kind: 'coupled' }),
          eligibility: { eligible: true },
        }),
      ])
    );
    const definition = renderApplyPolicyChangeConfirmation(selectApplyPreviewFacts(preview));

    expect(definition).toEqual(
      expect.objectContaining({
        color: 'warning',
        title: 'Apply 6 change(s) to "Endpoint Policy"?',
        confirm_text: 'Apply changes',
        cancel_text: 'Cancel',
      })
    );
    expect(definition).not.toHaveProperty('id');
    const lines = definition.message?.split('\n') ?? [];
    expect(lines[0]).toBe('| Setting | From | To | Origin |');
    expect(lines[1]).toBe('| --- | --- | --- | --- |');
    expect(lines.slice(2, 5)).toEqual([
      '| windows.malware.mode | "prevent" | "detect" | direct |',
      '| mac.malware.mode | "prevent" | "detect" | direct |',
      '| linux.malware.mode | "prevent" | "detect" | direct |',
    ]);
    expect(lines.slice(5, 8)).toEqual([
      '| windows.popup.malware.enabled | true | false | coupled |',
      '| mac.popup.malware.enabled | null | false | coupled |',
      '| linux.popup.malware.enabled | true | false | coupled |',
    ]);
    expect(lines[9]).toBe('- windows.antivirus_registration.enabled: true -> false');
    expect(lines[11]).toBe('Enrolled agents: 3 (source: fleet_status_aggregation).');
    expect(lines[12]).toBe('Status counts: all=3.');
    expect(lines[13]).toBe(
      'Counts are preview-time observations and may change and do not restrict which agents receive the policy.'
    );
    expect(lines[15]).toBe('Checked policy revision 1, version WzEsMV0= against the assessment.');
    expect(lines[16]).toBe(
      'Differences between the proposal and the policy Fleet returns are reported after apply.'
    );
  });

  it('renders an eligible coupled change with all rows and no side effects', () => {
    const preview = createPreview([
      { op: 'set_field', path: 'windows.popup.malware.enabled', value: false },
    ]);
    const definition = renderApplyPolicyChangeConfirmation(selectApplyPreviewFacts(preview));

    expect(definition).toEqual(
      expect.objectContaining({
        color: 'warning',
        title: 'Apply 3 change(s) to "Endpoint Policy"?',
      })
    );
    const lines = definition.message?.split('\n') ?? [];
    expect(lines[2]).toBe('| windows.popup.malware.enabled | true | false | direct |');
    expect(lines[3]).toBe('| mac.popup.malware.enabled | true | false | coupled |');
    expect(lines[4]).toBe('| linux.popup.malware.enabled | true | false | coupled |');
    expect(definition.message).toContain('Side effects: none');
  });

  it('marks enrollment unavailable when there are no agent policy assignments', () => {
    const definition = renderApplyPolicyChangeConfirmation(
      facts({
        blastRadius: {
          agentPolicyCount: 0,
          enrollment: {
            population: 'enrolled_agents',
            source: 'no_agent_policy_assignments',
            status: {},
          },
        },
      })
    );

    expect(definition.message).toContain('Enrolled agents: count unavailable');
    expect(definition.message).toContain('Status counts: none returned.');
    expect(definition.message).toContain('do not restrict which agents receive the policy');
  });

  it('lists returned status keys without summing when the headline count key is absent', () => {
    const definition = renderApplyPolicyChangeConfirmation(
      facts({
        blastRadius: {
          agentPolicyCount: 2,
          enrollment: {
            population: 'enrolled_agents',
            source: 'fleet_status_aggregation',
            status: { active: 1, offline: 2 },
          },
        },
      })
    );

    expect(definition.message).toContain('Enrolled agents: count unavailable.');
    expect(definition.message).toContain('Status counts: active=1, offline=2.');
  });
});
