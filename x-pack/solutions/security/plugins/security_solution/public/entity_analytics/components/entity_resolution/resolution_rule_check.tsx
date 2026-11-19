/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useResolutionRuleCheck } from './hooks/use_resolution_rule_check';
import type {
  ResolutionRuleCheckResult,
  ResolutionRuleCheckStatus,
} from './hooks/use_resolution_rule_check';
import {
  RULE_CHECK_ALL_HEALTHY,
  RULE_CHECK_APPLIED_TITLE,
  RULE_CHECK_ERROR,
  RULE_CHECK_FAILURE_DETAILS,
  RULE_CHECK_NEEDS_ATTENTION,
  RULE_CHECK_NO_RULE_APPLIES,
  RULE_CHECK_PROTOTYPE_BADGE,
  RULE_CHECK_SHOW_ALL,
  RULE_CHECK_STATUS_LABELS,
  RULE_CHECK_TITLE,
} from './translations';
import { RESOLUTION_RULE_CHECK_TEST_ID } from './test_ids';

const NEEDS_ATTENTION: ReadonlySet<ResolutionRuleCheckStatus> = new Set([
  'failing',
  'no_data',
  'declined',
]);
const APPLIED: ReadonlySet<ResolutionRuleCheckStatus> = new Set(['would_link', 'nothing_to_link']);

const STATUS_COLORS: Record<ResolutionRuleCheckStatus, string> = {
  failing: 'danger',
  no_data: 'warning',
  declined: 'warning',
  would_link: 'success',
  nothing_to_link: 'hollow',
  not_applicable: 'hollow',
  off: 'default',
};

const RuleRow: React.FC<{ rule: ResolutionRuleCheckResult }> = ({ rule }) => {
  const { failure } = rule;
  return (
    <div>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiBadge color={STATUS_COLORS[rule.status]}>
            {RULE_CHECK_STATUS_LABELS[rule.status]}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>{rule.rule_id}</strong>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiText size="xs" color="subdued">
        {rule.reason}
      </EuiText>
      {failure && (
        <EuiText size="xs" color="subdued">
          {RULE_CHECK_FAILURE_DETAILS(
            failure.consecutive_failures,
            failure.next_attempt_at ?? '-',
            failure.last_error ?? '-'
          )}
        </EuiText>
      )}
      <EuiSpacer size="s" />
    </div>
  );
};

/**
 * PROTOTYPE, not for merge: a compact per-entity summary of the resolution rules. It shows what
 * needs attention first, then the rules that apply, and keeps the rest behind an accordion.
 */
export const ResolutionRuleCheck: React.FC<{ entityId: string }> = ({ entityId }) => {
  const { data, isLoading, isError } = useResolutionRuleCheck(entityId);

  const attention = data?.rules.filter(({ status }) => NEEDS_ATTENTION.has(status)) ?? [];
  const applied = data?.rules.filter(({ status }) => APPLIED.has(status)) ?? [];
  const others =
    data?.rules.filter(({ status }) => !NEEDS_ATTENTION.has(status) && !APPLIED.has(status)) ?? [];

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj={RESOLUTION_RULE_CHECK_TEST_ID}>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h4>{RULE_CHECK_TITLE}</h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{RULE_CHECK_PROTOTYPE_BADGE}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {isLoading && <EuiSkeletonText lines={3} />}
      {isError && (
        <EuiText size="s" color="danger">
          {RULE_CHECK_ERROR}
        </EuiText>
      )}
      {data && (
        <>
          <EuiBadge color={data.summary.healthy ? 'success' : 'danger'}>
            {data.summary.healthy
              ? RULE_CHECK_ALL_HEALTHY
              : RULE_CHECK_NEEDS_ATTENTION(data.summary.needs_attention)}
          </EuiBadge>
          <EuiSpacer size="s" />
          {attention.map((rule) => (
            <RuleRow key={rule.rule_id} rule={rule} />
          ))}
          <EuiText size="xs" color="subdued">
            {applied.length > 0
              ? RULE_CHECK_APPLIED_TITLE(applied.length)
              : RULE_CHECK_NO_RULE_APPLIES}
          </EuiText>
          <EuiSpacer size="xs" />
          {applied.map((rule) => (
            <RuleRow key={rule.rule_id} rule={rule} />
          ))}
          {others.length > 0 && (
            <EuiAccordion
              id={`resolutionRuleCheckOthers-${entityId}`}
              buttonContent={RULE_CHECK_SHOW_ALL(others.length)}
              paddingSize="s"
            >
              {others.map((rule) => (
                <RuleRow key={rule.rule_id} rule={rule} />
              ))}
            </EuiAccordion>
          )}
        </>
      )}
    </EuiPanel>
  );
};
