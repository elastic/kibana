/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import type { ApprovalRequirement, WatchApprovalGate } from '@kbn/pnd-common';
import * as i18n from '../settings_translations';

const EM_DASH = '—';

/** Requirements a customer may choose between. `in-scope` is informational, never selectable. */
const SELECTABLE_REQUIREMENTS: ApprovalRequirement[] = ['always', 'high-impact'];

interface ApprovalGatesTableProps {
  gates: WatchApprovalGate[];
  onRequirementChange: (gateId: string, requirement: ApprovalRequirement) => void;
  onApproverChange: (gateId: string, approverRoleId: string) => void;
}

export const ApprovalGatesTable: React.FC<ApprovalGatesTableProps> = ({
  gates,
  onRequirementChange,
  onApproverChange,
}) => {
  const columns = useMemo<Array<EuiBasicTableColumn<WatchApprovalGate>>>(
    () => [
      {
        field: 'id',
        name: i18n.COL_ACTION_TYPE,
        render: (gateId: string) => (
          <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{i18n.GATE_NAMES[gateId] ?? gateId}</strong>
              </EuiText>
            </EuiFlexItem>
            {i18n.GATE_QUALIFIERS[gateId] ? (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {i18n.GATE_QUALIFIERS[gateId]}
                </EuiText>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        ),
      },
      {
        field: 'requirement',
        name: i18n.COL_REQUIRES_APPROVAL,
        width: '210px',
        render: (requirement: ApprovalRequirement, gate: WatchApprovalGate) => {
          const gateName = i18n.GATE_NAMES[gate.id] ?? gate.id;

          // A locked gate always gates, so it reads as static text rather than an inert select.
          if (gate.requirementLocked) {
            return (
              <EuiText size="s" data-test-subj={`pndGateRequirement-${gate.id}`}>
                {i18n.APPROVAL_REQUIREMENT_LABELS[requirement] ?? requirement}
              </EuiText>
            );
          }

          return (
            <EuiSelect
              compressed
              value={requirement}
              options={SELECTABLE_REQUIREMENTS.map((value) => ({
                value,
                text: i18n.APPROVAL_REQUIREMENT_LABELS[value] ?? value,
              }))}
              aria-label={i18n.requirementSelectAriaLabel(gateName)}
              data-test-subj={`pndGateRequirement-${gate.id}`}
              onChange={(event) =>
                onRequirementChange(gate.id, event.target.value as ApprovalRequirement)
              }
            />
          );
        },
      },
      {
        field: 'approverRoleId',
        name: i18n.COL_APPROVER_ROLE,
        width: '210px',
        render: (approverRoleId: string | null, gate: WatchApprovalGate) => {
          // Gates with no side effects need no approver.
          if (approverRoleId == null) {
            return (
              <EuiText size="s" color="subdued" data-test-subj={`pndGateApprover-${gate.id}`}>
                {EM_DASH}
              </EuiText>
            );
          }

          const options = gate.approverRoleOptionIds ?? [approverRoleId];
          return (
            <EuiSelect
              compressed
              value={approverRoleId}
              options={options.map((value) => ({
                value,
                text: i18n.APPROVER_ROLE_LABELS[value] ?? value,
              }))}
              aria-label={i18n.approverSelectAriaLabel(i18n.GATE_NAMES[gate.id] ?? gate.id)}
              data-test-subj={`pndGateApprover-${gate.id}`}
              onChange={(event) => onApproverChange(gate.id, event.target.value)}
            />
          );
        },
      },
    ],
    [onApproverChange, onRequirementChange]
  );

  return (
    <EuiBasicTable
      items={gates}
      columns={columns}
      tableLayout="auto"
      tableCaption={i18n.GATES_SECTION_SUBTITLE}
      data-test-subj="pndApprovalGatesTable"
    />
  );
};
