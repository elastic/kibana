/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import moment from 'moment';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiBasicTable,
  type EuiBasicTableColumn,
  type EuiTableSelectionType,
  type Criteria,
  type EuiTableSortingType,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldSearch,
  EuiHorizontalRule,
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
import { useKibana } from '../../../../common/lib/kibana';
import { TableHeader } from '../../../common/components';
import { WorkflowDetailsFlyout } from '../workflow_details_flyout';
import { WorkflowDetailsFlyoutExpanding } from '../workflow_details_flyout/expanding_flyout';
import { useFlyoutVariant } from '../../common/flyout_variant';
import * as i18n from './translations';

const STATUS_BADGE: Record<WorkflowMigrationStatus, { color: string; label: string }> = {
  translated: { color: 'hollow', label: i18n.STATUS_TRANSLATED },
  partially_translated: { color: 'warning', label: i18n.STATUS_PARTIALLY_TRANSLATED },
  installed: { color: 'success', label: i18n.STATUS_INSTALLED },
  error: { color: 'danger', label: i18n.STATUS_ERROR },
};

const WorkflowsTableComponent: React.FC = () => {
  const flyoutVariant = useFlyoutVariant();
  const { euiTheme } = useEuiTheme();
  const { navigateToApp } = useKibana().services.application;
  const openWorkflowsApp = useCallback(() => navigateToApp('workflows'), [navigateToApp]);
  const [rows] = useState(MOCK_WORKFLOW_ROWS);
  const [searchTerm, setSearchTerm] = useState('');
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<WorkflowMigrationRow[]>([]);
  const [sortField, setSortField] = useState<keyof WorkflowMigrationRow>('updatedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const sorting: EuiTableSortingType<WorkflowMigrationRow> = useMemo(
    () => ({ sort: { field: sortField, direction: sortDirection } }),
    [sortField, sortDirection]
  );

  const onTableChange = useCallback(({ sort }: Criteria<WorkflowMigrationRow>) => {
    if (sort) {
      setSortField(sort.field);
      setSortDirection(sort.direction);
    }
  }, []);

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
    const matchingRows = term
      ? rows.filter(
          (row) =>
            row.name.toLowerCase().includes(term) || row.description.toLowerCase().includes(term)
        )
      : rows;
    return [...matchingRows].sort((a, b) => {
      const order = String(a[sortField]).localeCompare(String(b[sortField]));
      return sortDirection === 'asc' ? order : -order;
    });
  }, [rows, searchTerm, sortField, sortDirection]);

  const columns: Array<EuiBasicTableColumn<WorkflowMigrationRow>> = useMemo(
    () => [
      {
        field: 'updatedAt',
        name: i18n.UPDATED_COLUMN,
        render: (updatedAt: string) => moment(updatedAt).format('M/D/YY'),
        sortable: true,
        align: 'center',
        width: '10%',
      },
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
            <EuiText
              size="xs"
              color="subdued"
              title={row.description}
              css={css`
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
              `}
            >
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
        field: 'migrationStatus',
        name: (
          <TableHeader
            title={i18n.STATUS_COLUMN}
            tooltipContent={
              <FormattedMessage
                id="xpack.securitySolution.siemMigrations.workflows.table.statusTooltip"
                defaultMessage={`{title}
                {installed} - already added to Elastic Workflows. Click "View in workflows" to manage and run it.{lineBreak}
                {translated} - ready to install. Every step was mapped to an Elastic workflow step.{lineBreak}
                {partiallyTranslated} - some steps need review. Configure any missing connectors or APIs and check the YAML.{lineBreak}
                {error} - the workflow could not be translated.`}
                values={{
                  lineBreak: <br />,
                  title: (
                    <EuiText size="s">
                      <p>
                        <b>{i18n.STATUS_TOOLTIP_TITLE}</b>
                        <EuiHorizontalRule margin="s" />
                      </p>
                    </EuiText>
                  ),
                  installed: <b>{i18n.STATUS_INSTALLED}</b>,
                  translated: <b>{i18n.STATUS_TRANSLATED}</b>,
                  partiallyTranslated: <b>{i18n.STATUS_PARTIALLY_TRANSLATED}</b>,
                  error: <b>{i18n.STATUS_ERROR}</b>,
                }}
              />
            }
          />
        ),
        sortable: true,
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
                    iconType="workflow"
                    aria-label={i18n.VIEW_ACTION}
                    disabled={row.migrationStatus !== 'installed'}
                    onClick={openWorkflowsApp}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
    ],
    [euiTheme, openWorkflowsApp]
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
            <EuiFilterButton numFilters={4} hasActiveFilters={false}>
              {i18n.STATUS_FILTER}
            </EuiFilterButton>
            <EuiFilterButton numFilters={8} hasActiveFilters={false}>
              {i18n.CREATED_BY_FILTER}
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
        sorting={sorting}
        onChange={onTableChange}
      />
      {openRowId === 'phishing-email-response' &&
        (flyoutVariant === 'expanding' ? (
          <WorkflowDetailsFlyoutExpanding onClose={() => setOpenRowId(null)} />
        ) : (
          <WorkflowDetailsFlyout onClose={() => setOpenRowId(null)} />
        ))}
    </>
  );
};

export const WorkflowsTable = React.memo(WorkflowsTableComponent);
WorkflowsTable.displayName = 'WorkflowsTable';
