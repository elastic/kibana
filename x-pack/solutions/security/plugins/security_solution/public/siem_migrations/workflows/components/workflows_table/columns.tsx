/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiHorizontalRule,
  EuiLink,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { WorkflowMigrationWorkflow } from '../../../../../common/siem_migrations/model/workflow_migration.gen';
import {
  MigrationTranslationResult,
  SiemMigrationStatus,
} from '../../../../../common/siem_migrations/constants';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import { PanelText } from '../../../../common/components/panel_text';
import { TableHeader } from '../../../common/components';
import { isMigrationItemNavigableWithFlyout } from '../../../common/utils';
import { StatusBadge } from './status_badge';
import * as i18n from './translations';

export type TableColumn = EuiBasicTableColumn<WorkflowMigrationWorkflow>;

interface NameCellProps {
  workflow: WorkflowMigrationWorkflow;
  openWorkflowDetailsFlyout: (workflow: WorkflowMigrationWorkflow) => void;
}

// The tooltips show the full text of the name and of the description, as both are truncated.
// The tooltip anchor is a block so the truncation of its content still applies.
const NameCell = ({ workflow, openWorkflowDetailsFlyout }: NameCellProps) => {
  const { euiTheme } = useEuiTheme();
  const title = workflow.elastic_workflow?.title ?? workflow.original_workflow.title;
  const description =
    workflow.elastic_workflow?.description ?? workflow.original_workflow.description;

  const onClick = useCallback(
    () => openWorkflowDetailsFlyout(workflow),
    [openWorkflowDetailsFlyout, workflow]
  );

  return (
    <>
      <EuiToolTip content={title} display="block">
        {isMigrationItemNavigableWithFlyout(workflow) ? (
          <EuiText size="s" className="eui-textTruncate">
            <EuiLink onClick={onClick} data-test-subj="workflowName">
              <strong>{title}</strong>
            </EuiLink>
          </EuiText>
        ) : (
          <EuiText
            data-test-subj="workflowName"
            size="s"
            color="danger"
            className="eui-textTruncate"
          >
            <strong>{title}</strong>
          </EuiText>
        )}
      </EuiToolTip>
      {description && (
        <EuiToolTip content={description} display="block">
          <PanelText size="xs" subdued>
            {/* a block element, the ellipsis does not apply to an inline one */}
            <div
              data-test-subj="workflowDescription"
              className="eui-textTruncate"
              style={{ paddingRight: euiTheme.size.l }}
            >
              {description}
            </div>
          </PanelText>
        </EuiToolTip>
      )}
    </>
  );
};

export type CreateNameColumnParams = Pick<NameCellProps, 'openWorkflowDetailsFlyout'>;

export const createNameColumn = ({
  openWorkflowDetailsFlyout,
}: CreateNameColumnParams): TableColumn => ({
  field: 'original_workflow.title',
  name: i18n.COLUMN_NAME,
  render: (_, workflow: WorkflowMigrationWorkflow) => (
    <NameCell workflow={workflow} openWorkflowDetailsFlyout={openWorkflowDetailsFlyout} />
  ),
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

const isInstallable = (workflow: WorkflowMigrationWorkflow) =>
  workflow.status !== SiemMigrationStatus.FAILED &&
  (workflow.translation_result === MigrationTranslationResult.FULL ||
    workflow.translation_result === MigrationTranslationResult.PARTIAL);

/**
 * Only one action is shown at a time: "View" once the workflow is installed, otherwise "Install" for
 * a translated one. Failed and untranslatable workflows have no action.
 * Both actions are placeholders for now, installing and viewing are not wired yet.
 */
const ActionsCell = ({ workflow }: { workflow: WorkflowMigrationWorkflow }) => {
  if (workflow.elastic_workflow?.id) {
    return (
      <EuiToolTip content={i18n.VIEW_WORKFLOW} disableScreenReaderOutput>
        <EuiButtonIcon
          data-test-subj="viewWorkflowButton"
          iconType="workflow"
          aria-label={i18n.VIEW_WORKFLOW}
        />
      </EuiToolTip>
    );
  }
  if (isInstallable(workflow)) {
    return (
      <EuiToolTip content={i18n.INSTALL_WORKFLOW} disableScreenReaderOutput>
        <EuiButtonIcon
          data-test-subj="installWorkflowButton"
          iconType="download"
          aria-label={i18n.INSTALL_WORKFLOW}
        />
      </EuiToolTip>
    );
  }
  return null;
};

export const createActionsColumn = (): TableColumn => ({
  name: (
    <TableHeader
      title={i18n.COLUMN_ACTIONS}
      tooltipContent={
        <FormattedMessage
          id="xpack.securitySolution.siemMigrations.workflows.table.actionsTooltip"
          defaultMessage="{title}
          {view} - go to the installed workflow.{lineBreak}
          {install} - install workflow to view and edit it."
          values={{
            lineBreak: <br />,
            title: (
              <EuiText size="s">
                <p>
                  <b>{i18n.COLUMN_ACTIONS}</b>
                  <EuiHorizontalRule margin="s" />
                </p>
              </EuiText>
            ),
            view: <b>{i18n.ACTIONS_VIEW_LABEL}</b>,
            install: <b>{i18n.ACTIONS_INSTALL_LABEL}</b>,
          }}
        />
      }
    />
  ),
  render: (workflow: WorkflowMigrationWorkflow) => <ActionsCell workflow={workflow} />,
  width: '10%',
  align: 'left',
});

export const getWorkflowsTableColumns = ({
  openWorkflowDetailsFlyout,
}: CreateNameColumnParams): TableColumn[] => [
  createNameColumn({ openWorkflowDetailsFlyout }),
  createStatusColumn(),
  createTranslatedOnColumn(),
  createActionsColumn(),
];
