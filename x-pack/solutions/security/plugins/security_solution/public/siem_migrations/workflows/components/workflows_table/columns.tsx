/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiButtonIcon, EuiText, EuiToolTip } from '@elastic/eui';
import type { WorkflowMigrationWorkflow } from '../../../../../common/siem_migrations/model/workflow_migration.gen';
import { SiemMigrationStatus } from '../../../../../common/siem_migrations/constants';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import { PanelText } from '../../../../common/components/panel_text';
import { StatusBadge } from './status_badge';
import * as i18n from './translations';

export type TableColumn = EuiBasicTableColumn<WorkflowMigrationWorkflow>;

const NameCell = ({ workflow }: { workflow: WorkflowMigrationWorkflow }) => {
  const title = workflow.elastic_workflow?.title ?? workflow.original_workflow.title;
  const description =
    workflow.elastic_workflow?.description ?? workflow.original_workflow.description;
  const isFailed = workflow.status === SiemMigrationStatus.FAILED;

  return (
    <>
      <EuiText
        data-test-subj="workflowName"
        size="s"
        color={isFailed ? 'danger' : undefined}
        className="eui-textTruncate"
      >
        <strong>{title}</strong>
      </EuiText>
      {description && (
        <PanelText data-test-subj="workflowDescription" size="xs" subdued>
          <span className="eui-textTruncate">{description}</span>
        </PanelText>
      )}
    </>
  );
};

export const createNameColumn = (): TableColumn => ({
  field: 'original_workflow.title',
  name: i18n.COLUMN_NAME,
  render: (_, workflow: WorkflowMigrationWorkflow) => <NameCell workflow={workflow} />,
  sortable: true,
  truncateText: true,
  width: '50%',
  align: 'left',
});

export const createStatusColumn = (): TableColumn => ({
  field: 'translation_result',
  name: i18n.COLUMN_STATUS,
  render: (_, workflow: WorkflowMigrationWorkflow) => (
    <StatusBadge
      data-test-subj={`translationStatus-${workflow.translation_result ?? workflow.status}`}
      workflow={workflow}
    />
  ),
  sortable: true,
  truncateText: true,
  width: '20%',
  align: 'left',
});

export const createTranslatedOnColumn = (): TableColumn => ({
  field: 'updated_at',
  name: i18n.COLUMN_TRANSLATED_ON,
  render: (value: WorkflowMigrationWorkflow['updated_at']) => (
    <FormattedRelativePreferenceDate value={value} dateFormat="M/D/YY" />
  ),
  sortable: true,
  truncateText: true,
  width: '20%',
  align: 'left',
});

/** The details flyout is not part of this version, the action is shown but disabled */
export const createDetailsColumn = (): TableColumn => ({
  name: i18n.COLUMN_DETAILS,
  render: () => (
    <EuiToolTip content={i18n.WORKFLOW_DETAILS_UNAVAILABLE} disableScreenReaderOutput>
      <EuiButtonIcon
        data-test-subj="workflowDetailsButton"
        iconType="maximize"
        aria-label={i18n.WORKFLOW_DETAILS_UNAVAILABLE}
        isDisabled
      />
    </EuiToolTip>
  ),
  width: '10%',
  align: 'center',
});

export const getWorkflowsTableColumns = (): TableColumn[] => [
  createNameColumn(),
  createStatusColumn(),
  createTranslatedOnColumn(),
  createDetailsColumn(),
];
