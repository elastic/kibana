/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiBasicTable, EuiButtonEmpty, EuiIconTip } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  PolicyOnboardingState,
  PolicyStatus,
} from '@kbn/cloud-security-posture-common/native_vuln_scanner/types';
import { getStateLabel } from './translations';
import {
  SCANNER_SETTINGS_TEST_SUBJECTS,
  getCollectInventoryTestSubject,
  getPolicyRowTestSubject,
} from './test_subjects';

interface PolicyTableProps {
  policies: PolicyStatus[];
  agentsVisible: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  /** False for read-only users: the rows stay visible but cannot be selected. */
  canSelect: boolean;
  /**
   * Re-requests the inventory of one policy. Omitted when the viewer cannot run the pack or the
   * pack is unknown, which hides the action.
   */
  onCollectInventory?: (policyId: string) => void;
  /** Ids of the policies whose inventory request is in flight. */
  collectingIds?: string[];
}

const STATE_COLORS: Record<PolicyOnboardingState, string> = {
  not_configured: 'default',
  pending_inventory: 'warning',
  reporting: 'primary',
  scanned: 'success',
};

const AGENTS_HIDDEN_TOOLTIP = i18n.translate(
  'xpack.csp.nativeVulnScanner.policyTable.agentsHiddenTooltip',
  {
    defaultMessage: 'You need Fleet agents read access to see agent counts.',
  }
);

const HiddenValue = ({ testSubj }: { testSubj: string }) => (
  <span data-test-subj={testSubj}>
    {'—'}{' '}
    <EuiIconTip
      type="questionInCircle"
      content={AGENTS_HIDDEN_TOOLTIP}
      aria-label={AGENTS_HIDDEN_TOOLTIP}
    />
  </span>
);

// no value yet (e.g. no agents enrolled or no inventory reported) — not a permissions matter
const EmptyValue = ({ testSubj }: { testSubj: string }) => (
  <span data-test-subj={testSubj}>—</span>
);

const yesNo = (value: boolean) =>
  value
    ? i18n.translate('xpack.csp.nativeVulnScanner.policyTable.yes', { defaultMessage: 'Yes' })
    : i18n.translate('xpack.csp.nativeVulnScanner.policyTable.no', { defaultMessage: 'No' });

export const PolicyTable = ({
  policies,
  agentsVisible,
  selectedIds,
  onSelectionChange,
  canSelect,
  onCollectInventory,
  collectingIds = [],
}: PolicyTableProps) => {
  const columns: Array<EuiBasicTableColumn<PolicyStatus>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.csp.nativeVulnScanner.policyTable.nameColumn', {
        defaultMessage: 'Agent policy',
      }),
      render: (name: string, { id }: PolicyStatus) => (
        <span data-test-subj={getPolicyRowTestSubject(id, 'name')}>{name}</span>
      ),
    },
    {
      field: 'agents',
      name: i18n.translate('xpack.csp.nativeVulnScanner.policyTable.agentsColumn', {
        defaultMessage: 'Agents online / total',
      }),
      render: (agents: PolicyStatus['agents'], { id }: PolicyStatus) => {
        const testSubj = getPolicyRowTestSubject(id, 'agents');
        if (!agentsVisible) return <HiddenValue testSubj={testSubj} />;
        if (!agents) return <EmptyValue testSubj={testSubj} />;
        return <span data-test-subj={testSubj}>{`${agents.online} / ${agents.total}`}</span>;
      },
    },
    {
      field: 'packAssigned',
      name: i18n.translate('xpack.csp.nativeVulnScanner.policyTable.packColumn', {
        defaultMessage: 'Inventory pack assigned',
      }),
      render: (assigned: boolean, { id }: PolicyStatus) => (
        <span data-test-subj={getPolicyRowTestSubject(id, 'pack')}>{yesNo(assigned)}</span>
      ),
    },
    {
      field: 'runtimePinned',
      name: i18n.translate('xpack.csp.nativeVulnScanner.policyTable.runtimeColumn', {
        defaultMessage: 'Runtime pinned',
      }),
      render: (pinned: boolean, { id }: PolicyStatus) => (
        <span data-test-subj={getPolicyRowTestSubject(id, 'runtime')}>{yesNo(pinned)}</span>
      ),
    },
    {
      field: 'reportingInventory',
      name: i18n.translate('xpack.csp.nativeVulnScanner.policyTable.reportingColumn', {
        defaultMessage: 'Reporting inventory',
      }),
      render: (reporting: number | null, { id }: PolicyStatus) => {
        const testSubj = getPolicyRowTestSubject(id, 'reporting');
        if (!agentsVisible) return <HiddenValue testSubj={testSubj} />;
        if (reporting === null) return <EmptyValue testSubj={testSubj} />;
        return <span data-test-subj={testSubj}>{reporting}</span>;
      },
    },
    {
      field: 'state',
      name: i18n.translate('xpack.csp.nativeVulnScanner.policyTable.stateColumn', {
        defaultMessage: 'State',
      }),
      render: (state: PolicyOnboardingState, { id }: PolicyStatus) => (
        <EuiBadge color={STATE_COLORS[state]} data-test-subj={getPolicyRowTestSubject(id, 'state')}>
          {getStateLabel(state)}
        </EuiBadge>
      ),
    },
  ];

  if (onCollectInventory) {
    columns.push({
      name: i18n.translate('xpack.csp.nativeVulnScanner.policyTable.actionsColumn', {
        defaultMessage: 'Actions',
      }),
      render: ({ id, state }: PolicyStatus) => {
        if (state !== 'pending_inventory') return null;
        const isCollecting = collectingIds.includes(id);
        return (
          <EuiButtonEmpty
            size="xs"
            iconType="refresh"
            onClick={() => onCollectInventory(id)}
            isDisabled={isCollecting}
            isLoading={isCollecting}
            data-test-subj={getCollectInventoryTestSubject(id)}
          >
            {i18n.translate('xpack.csp.nativeVulnScanner.policyTable.collectInventory', {
              defaultMessage: 'Collect inventory now',
            })}
          </EuiButtonEmpty>
        );
      },
    });
  }

  return (
    <EuiBasicTable<PolicyStatus>
      tableCaption={i18n.translate('xpack.csp.nativeVulnScanner.policyTable.caption', {
        defaultMessage: 'Agent policies and their vulnerability scanner state',
      })}
      items={policies}
      itemId="id"
      columns={columns}
      selection={{
        onSelectionChange: (selected) => onSelectionChange(selected.map(({ id }) => id)),
        selected: policies.filter(({ id }) => selectedIds.includes(id)),
        selectable: () => canSelect,
      }}
      data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.POLICY_TABLE}
    />
  );
};
