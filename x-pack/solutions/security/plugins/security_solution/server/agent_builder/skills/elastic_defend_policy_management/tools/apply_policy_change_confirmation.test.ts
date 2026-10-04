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
  endpointCustomYaraSignatures: true,
  customYaraSignaturesExperimental: true,
  endpointProtectionUpdates: true,
  endpointCustomNotification: true,
  serverless: false,
});

const createNormalizedPolicy = (
  stored: PolicyConfig,
  identityOverrides: Partial<{ id: string; name: string }> = {}
) => {
  const packagePolicy = generator.generateEndpointPackagePolicy({
    id: identityOverrides.id ?? 'policy-1',
    name: identityOverrides.name ?? 'Endpoint Policy',
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
  overrides: Partial<ApplyPolicyChangePreview> = {},
  identityOverrides: Partial<{ id: string; name: string }> = {}
): ApplyPolicyChangePreview => {
  const normalized = createNormalizedPolicy(stored, identityOverrides);
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
  policyId: 'policy-1',
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
      stored,
      {},
      { name: '[Reviewed and safe](https://example.com)\r& <audit@corp.example.com>' }
    );
    const definition = renderApplyPolicyChangeConfirmation(selectApplyPreviewFacts(preview));

    expect(definition).toEqual(
      expect.objectContaining({
        color: 'warning',
        title:
          'Apply 6 change(s) to "\\[Reviewed and safe\\]\\(https://example\\.com\\) &amp; &lt;audit@corp\\.example\\.com\\>"?',
        confirm_text: 'Apply changes',
        cancel_text: 'Cancel',
      })
    );
    expect(definition).not.toHaveProperty('id');
    const lines = definition.message?.split('\n') ?? [];
    expect(lines[0]).toBe('Warnings:');
    expect(lines[1]).toBe(
      '- Malware protection on Windows, macOS, Linux changes to Detect: this protection generates alerts but does not block threats.'
    );
    expect(lines.slice(5, 8)).toEqual([
      '| windows\\.malware\\.mode | "prevent" | "detect" | direct |',
      '| mac\\.malware\\.mode | "prevent" | "detect" | direct |',
      '| linux\\.malware\\.mode | "prevent" | "detect" | direct |',
    ]);
    expect(lines.slice(8, 11)).toEqual([
      '| windows\\.popup\\.malware\\.enabled | true | false | coupled |',
      '| mac\\.popup\\.malware\\.enabled | null | false | coupled |',
      '| linux\\.popup\\.malware\\.enabled | true | false | coupled |',
    ]);
    expect(lines[5]).not.toMatch(/\\"|\\:/);
    expect(lines[12]).toBe('Derived setting updates:');
    expect(lines[13]).toBe('- windows\\.antivirus\\_registration\\.enabled: true -> false');
    expect(lines[19]).toBe('Policy ID: policy\\-1');
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
    expect(definition.message).not.toContain('Warnings:');
    const lines = definition.message?.split('\n') ?? [];
    expect(lines[0]).toBe('| Setting | From | To | Origin |');
    expect(lines[1]).toBe('| --- | --- | --- | --- |');
    expect(lines[2]).toBe('| windows\\.popup\\.malware\\.enabled | true | false | direct |');
    expect(lines[3]).toBe('| mac\\.popup\\.malware\\.enabled | true | false | coupled |');
    expect(lines[4]).toBe('| linux\\.popup\\.malware\\.enabled | true | false | coupled |');
    expect(definition.message).toContain('Derived setting updates: none');
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
