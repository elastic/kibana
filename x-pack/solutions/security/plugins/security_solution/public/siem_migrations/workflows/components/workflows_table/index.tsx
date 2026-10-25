/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBasicTable,
  type EuiBasicTableColumn,
  type EuiTableSelectionType,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFilterButton,
  EuiText,
  EuiBadge,
  EuiIcon,
  EuiToolTip,
  EuiButtonIcon,
  EuiSpacer,
  EuiLink,
  useEuiTheme,
} from '@elastic/eui';
import {
  MOCK_WORKFLOW_ROWS,
  type WorkflowMigrationRow,
  type WorkflowMigrationStatus,
} from '../../common/workflow_content';
import { WorkflowDetailsFlyout } from '../workflow_details_flyout';
import * as i18n from './translations';

const STATUS_BADGE: Record<WorkflowMigrationStatus, { color: string; label: string }> = {
  translated: { color: 'hollow', label: i18n.STATUS_TRANSLATED },
  partially_translated: { color: 'warning', label: i18n.STATUS_PARTIALLY_TRANSLATED },
  installed: { color: 'success', label: i18n.STATUS_INSTALLED },
  error: { color: 'danger', label: i18n.STATUS_ERROR },
};

export const WorkflowsTable: React.FC = React.memo(() => {
  const { euiTheme } = useEuiTheme();
  const [rows] = useState(MOCK_WORKFLOW_ROWS);
  const [searchTerm, setSearchTerm] = useState('');
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<WorkflowMigrationRow[]>([]);

  const selection: EuiTableSelectionType<WorkflowMigrationRow> = useMemo(
    () => ({
      selectable: () => true,
      onSelectionChange: setSelectedRows,
      selected: selectedRows,
    }),
    [selectedRows]
  );

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return rows;
    }
    return rows.filter(
      (row) => row.name.toLowerCase().includes(term) || row.description.toLowerCase().includes(term)
    );
  }, [rows, searchTerm]);

  const columns: Array<EuiBasicTableColumn<WorkflowMigrationRow>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.NAME_COLUMN,
        render: (name: string, row: WorkflowMigrationRow) => (
          <div>
            {row.id === 'phishing-email-response' ? (
              <EuiLink onClick={() => setOpenRowId(row.id)}>
                <strong>{name}</strong>
              </EuiLink>
            ) : (
              <EuiText size="s" color="default">
                <strong>{name}</strong>
              </EuiText>
            )}
            <EuiText size="xs" color="subdued">
              {row.description}
            </EuiText>
          </div>
        ),
      },
      {
        name: i18n.TRIGGERS_AND_STEPS_COLUMN,
        render: (row: WorkflowMigrationRow) => (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type={row.triggerIcon} size="m" aria-hidden={true} />
            </EuiFlexItem>
            {row.stepIcons.length > 0 && (
              <>
                <EuiFlexItem grow={false}>
                  <div style={{ width: 1, height: 16, backgroundColor: euiTheme.border.color }} />
                </EuiFlexItem>
                {row.stepIcons.map((iconType, index) => (
                  <EuiFlexItem grow={false} key={`${iconType}-${index}`}>
                    <EuiIcon type={iconType} size="m" aria-hidden={true} />
                  </EuiFlexItem>
                ))}
              </>
            )}
          </EuiFlexGroup>
        ),
      },
      {
        name: i18n.CONNECTORS_COLUMN,
        render: (row: WorkflowMigrationRow) => (
          <EuiBadge color="hollow" iconType="package">
            {`${row.connectorsInstalled}/${row.connectorsTotal}`}
          </EuiBadge>
        ),
      },
      {
        field: 'migrationStatus',
        name: i18n.STATUS_COLUMN,
        render: (status: WorkflowMigrationStatus) => {
          const { color, label } = STATUS_BADGE[status];
          return <EuiBadge color={color}>{label}</EuiBadge>;
        },
      },
      {
        name: i18n.ACTIONS_COLUMN,
        render: (row: WorkflowMigrationRow) => {
          const isInstallDisabled =
            row.migrationStatus === 'error' || row.migrationStatus === 'installed';
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={i18n.INSTALL_ACTION} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="download"
                    aria-label={i18n.INSTALL_ACTION}
                    disabled={isInstallDisabled}
                    onClick={() => {}}
                  />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={i18n.VIEW_ACTION} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="eye"
                    aria-label={i18n.VIEW_ACTION}
                    onClick={
                      row.id === 'phishing-email-response' ? () => setOpenRowId(row.id) : undefined
                    }
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
    ],
    [euiTheme]
  );

  return (
    <>
      <EuiFlexGroup gutterSize="s" responsive={false} wrap>
        <EuiFlexItem grow={true} style={{ minWidth: 240 }}>
          <EuiFieldSearch
            placeholder={i18n.SEARCH_PLACEHOLDER}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
            isClearable
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFilterGroup>
            <EuiFilterButton numFilters={2} hasActiveFilters={false}>
              {i18n.STATUS_FILTER}
            </EuiFilterButton>
            <EuiFilterButton numFilters={5} hasActiveFilters={false}>
              {i18n.TAG_FILTER}
            </EuiFilterButton>
            <EuiFilterButton numFilters={8} hasActiveFilters={false}>
              {i18n.CREATED_BY_FILTER}
            </EuiFilterButton>
            <EuiFilterButton numFilters={1} hasActiveFilters={false}>
              {i18n.MANAGED_FILTER}
            </EuiFilterButton>
          </EuiFilterGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiText size="s" color="subdued">
        {i18n.SHOWING_ROWS(filteredRows.length, rows.length)}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiBasicTable
        items={filteredRows}
        columns={columns}
        rowHeader="name"
        tableCaption={i18n.TABLE_CAPTION}
        itemId="id"
        selection={selection}
      />
      {openRowId === 'phishing-email-response' && (
        <WorkflowDetailsFlyout onClose={() => setOpenRowId(null)} />
      )}
    </>
  );
});
WorkflowsTable.displayName = 'WorkflowsTable';
