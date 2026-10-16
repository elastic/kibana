/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConfirmPromptDefinition } from '@kbn/agent-builder-common/agents';
import type { ApplyPolicyChangePreview } from '../services/apply_policy_change';
import type { EndpointCountResult } from '../services/count_endpoints';
import {
  DEFAULT_TRIM_LIMITS,
  capPresentedIdentityString,
  presentFromTo,
} from './trim_policy_result';

export type ApplyPreviewChangeRow = Readonly<{
  path: string;
  from: unknown;
  to: unknown;
  originKind: 'direct' | 'coupled';
}>;

export type ApplyPreviewSideEffect = Readonly<{
  path: string;
  from: unknown;
  to: unknown;
}>;

export type ApplyPreviewFacts = Readonly<{
  policyId: string;
  policyName: string;
  policyRevision: number;
  policyVersion: string;
  changeTotal: number;
  directRows: readonly ApplyPreviewChangeRow[];
  coupledRows: readonly ApplyPreviewChangeRow[];
  sideEffects: readonly ApplyPreviewSideEffect[];
  advisories?: readonly string[];
  blastRadius: Readonly<{
    agentPolicyCount: number;
    enrollment: EndpointCountResult;
  }>;
}>;

export type ApplyPolicyChangeConfirmation = Omit<ConfirmPromptDefinition, 'id'>;

export const selectApplyPreviewFacts = (preview: ApplyPolicyChangePreview): ApplyPreviewFacts => {
  const { policy, assessment, agentPolicyCount, enrollment } = preview;
  const rows: readonly ApplyPreviewChangeRow[] = assessment.changes.map((change) => ({
    path: change.path,
    from: change.from,
    to: change.to,
    originKind: change.origin.kind,
  }));

  return {
    policyId: policy.id,
    policyName: policy.name,
    policyRevision: policy.revision,
    policyVersion: policy.version,
    changeTotal: assessment.changes.length,
    directRows: rows.filter((row) => row.originKind === 'direct'),
    coupledRows: rows.filter((row) => row.originKind === 'coupled'),
    sideEffects: assessment.sideEffects.map((sideEffect) => ({
      path: sideEffect.path,
      from: sideEffect.from,
      to: sideEffect.to,
    })),
    advisories: assessment.advisories.map((advisory) => advisory.text),
    blastRadius: { agentPolicyCount, enrollment },
  };
};

const GFM_ESCAPABLE_CHARACTERS_REGEX = /[\\`*{}()[\]#+\-.!_>~|]/g;

const escapeMarkdownText = (text: string): string =>
  text
    .replace(/\r\n|\r|\n/g, ' ')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(GFM_ESCAPABLE_CHARACTERS_REGEX, '\\$&');

const renderValue = (value: unknown): string => {
  const serialized = value === undefined ? undefined : JSON.stringify(value);
  return escapeMarkdownText(typeof serialized === 'string' ? serialized : 'null');
};

const renderRow = (row: ApplyPreviewChangeRow): string => {
  const presented = presentFromTo(row, DEFAULT_TRIM_LIMITS);
  const truncated =
    presented.from_truncation !== undefined || presented.to_truncation !== undefined;
  const origin = truncated ? `${row.originKind} value truncated` : row.originKind;
  return `| ${escapeMarkdownText(row.path)} | ${renderValue(presented.from)} | ${renderValue(
    presented.to
  )} | ${origin} |`;
};

const renderSideEffect = (sideEffect: ApplyPreviewSideEffect): string => {
  const presented = presentFromTo(sideEffect, DEFAULT_TRIM_LIMITS);
  return `- ${escapeMarkdownText(sideEffect.path)}: ${renderValue(presented.from)} -> ${renderValue(
    presented.to
  )}`;
};

const renderBlastRadius = (blastRadius: ApplyPreviewFacts['blastRadius']): readonly string[] => {
  const { agentPolicyCount, enrollment } = blastRadius;
  const headline =
    agentPolicyCount === 0
      ? 'Enrolled agents: count unavailable because the policy has no agent policy assignments.'
      : enrollment.status.all !== undefined
      ? `Enrolled agents: ${enrollment.status.all} (source: ${escapeMarkdownText(
          enrollment.source
        )}).`
      : 'Enrolled agents: count unavailable.';
  const entries = Object.entries(enrollment.status);
  const statusLine =
    entries.length === 0
      ? 'Status counts: none returned.'
      : `Status counts: ${entries.map(([key, value]) => `${key}=${value}`).join(', ')}.`;

  return [
    headline,
    statusLine,
    'Counts are preview-time observations and may change and do not restrict which agents receive the policy.',
  ];
};

const formatConfirmationTitle = (changeTotal: number, policyName: string): string => {
  const { text: capped, truncated } = capPresentedIdentityString(policyName);
  const escaped = escapeMarkdownText(capped);
  const boundedName = truncated ? `${escaped}…` : escaped;
  return `Apply ${changeTotal} change(s) to "${boundedName}"?`;
};

export const renderApplyPolicyChangeConfirmation = (
  facts: ApplyPreviewFacts
): ApplyPolicyChangeConfirmation => {
  const rows = [...facts.directRows, ...facts.coupledRows].map(renderRow);
  const sideEffectLines =
    facts.sideEffects.length === 0
      ? ['Derived setting updates: none']
      : ['Derived setting updates:', ...facts.sideEffects.map(renderSideEffect)];
  const warningLines =
    facts.advisories !== undefined && facts.advisories.length > 0
      ? ['Warnings:', ...facts.advisories.map((text) => `- ${text}`), '']
      : [];

  const message = [
    ...warningLines,
    '| Setting | From | To | Origin |',
    '| --- | --- | --- | --- |',
    ...rows,
    '',
    ...sideEffectLines,
    '',
    ...renderBlastRadius(facts.blastRadius),
    '',
    `Policy ID: ${escapeMarkdownText(facts.policyId)}`,
    `Checked policy revision ${facts.policyRevision}, version ${escapeMarkdownText(
      facts.policyVersion
    )} against the assessment.`,
    'Differences between the proposal and the policy Fleet returns are reported after apply.',
  ].join('\n');

  return {
    color: 'warning',
    title: formatConfirmationTitle(facts.changeTotal, facts.policyName),
    message,
    confirm_text: 'Apply changes',
    cancel_text: 'Cancel',
  };
};
