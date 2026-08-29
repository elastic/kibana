/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';

import type { PndContainmentActionRecord } from '../../hooks/use_pnd_execution';
import { ContainmentActionStatusBadge } from '../containment_action_status_badge';

export interface LifecycleActionsEvidenceProps {
  actions: PndContainmentActionRecord[];
}

/**
 * What the execute-approved-actions row actually did: one title-plus-status pair per ledger entry,
 * and deliberately nothing more. The full rows — action types, reasons, compact error messages —
 * live in the Overview tab's Containment actions section; this inline node exists so the lifecycle
 * row that claims the step ran can show which actions it ran without leaving the view.
 */
export const LifecycleActionsEvidence: React.FC<LifecycleActionsEvidenceProps> = ({ actions }) => (
  <EuiPanel
    color="subdued"
    data-test-subj="pndLifecycleActionsEvidence"
    hasShadow={false}
    paddingSize="s"
  >
    <EuiFlexGroup gutterSize="s" responsive={false} wrap>
      {actions.map(({ status, title }, index) => (
        <EuiFlexItem grow={false} key={`${title}-${index}`}>
          <EuiFlexGroup
            alignItems="center"
            data-test-subj="pndLifecycleActionsEvidenceItem"
            gutterSize="xs"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiText size="xs">{title}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ContainmentActionStatusBadge status={status} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  </EuiPanel>
);
