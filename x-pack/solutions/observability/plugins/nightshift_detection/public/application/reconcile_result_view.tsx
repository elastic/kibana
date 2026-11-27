/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import type { ReconcileRulesResponse } from '../../common/reconcile';

const COUNTS = ['created', 'deleted', 'enabled', 'disabled'] as const;

interface ReconcileResultViewProps {
  result: ReconcileRulesResponse;
}

/** One reconcile: what changed in counts, then every rule or strategy it could not handle. */
export function ReconcileResultView({ result }: ReconcileResultViewProps) {
  if (result.status === 'busy') {
    return (
      <EuiFlexGroup
        data-test-subj="nightshiftDetectionInspectorReconcile"
        gutterSize="s"
        alignItems="center"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiBadge color="warning">busy</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">Another reconcile holds this space.</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const problems = [
    ...result.strategy_errors.map(({ strategy, message }) => `strategy ${strategy}: ${message}`),
    ...result.failures.map(
      ({ rule_id: ruleId, operation, message }) => `${operation} ${ruleId}: ${message}`
    ),
  ];

  return (
    <div data-test-subj="nightshiftDetectionInspectorReconcile">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiBadge color="success">completed</EuiBadge>
        </EuiFlexItem>
        {COUNTS.map((count) => (
          <EuiFlexItem grow={false} key={count}>
            <EuiBadge color={result[count] > 0 ? 'primary' : 'hollow'}>
              {count} {result[count]}
            </EuiBadge>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      {result.skipped.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <KbnWarningCallout size="s" title={`${result.skipped.length} rules skipped`}>
            <ul>
              {result.skipped.map(({ rule_id: ruleId, reason }) => (
                <li key={ruleId}>
                  {ruleId}: {reason}
                </li>
              ))}
            </ul>
          </KbnWarningCallout>
        </>
      )}
      {problems.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <KbnDangerCallout size="s" title={`${problems.length} failed`}>
            <ul>
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </KbnDangerCallout>
        </>
      )}
    </div>
  );
}
