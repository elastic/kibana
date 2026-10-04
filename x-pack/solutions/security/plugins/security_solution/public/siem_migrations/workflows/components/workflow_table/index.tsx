/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiTitle,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import type { RequiredConnector } from '../../../../../common/siem_migrations/parsers/tines';
import {
  EMAIL_CONNECTOR_PLACEHOLDER,
  SLACK_CONNECTOR_PLACEHOLDER,
} from '../../../../../common/siem_migrations/parsers/tines';
import type { WorkflowMigrationWorkflow } from '../../../../../common/siem_migrations/workflows/types';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../../common/lib/kibana';
import { CenteredLoadingSpinner } from '../../../../common/components/centered_loading_spinner';
import { saveAndRunTranslatedWorkflow, saveTranslatedWorkflow } from '../../api';
import { useWorkflowsMigrationPrivileges } from '../../hooks/use_workflows_migration_privileges';
import { useGetMigrationWorkflows } from '../../logic/use_get_migration_workflows';
import type { WorkflowMigrationStats } from '../../types';
import type { ConnectorSelections } from '../../utils/resolve_connector_placeholders';
import {
  hasUnresolvedConnectorPlaceholders,
  resolveConnectorPlaceholders,
} from '../../utils/resolve_connector_placeholders';
import { RequiredConnectorsPanel } from '../required_connectors_panel';
import * as pageI18n from '../../pages/translations';
import * as i18n from './translations';

const requiredConnectorsFromYaml = (yaml: string): RequiredConnector[] => {
  const required: RequiredConnector[] = [];
  if (yaml.includes(EMAIL_CONNECTOR_PLACEHOLDER)) {
    required.push({
      actionTypeId: '.email',
      placeholder: EMAIL_CONNECTOR_PLACEHOLDER,
      stepNames: [],
    });
  }
  if (yaml.includes(SLACK_CONNECTOR_PLACEHOLDER)) {
    required.push({
      actionTypeId: '.slack',
      placeholder: SLACK_CONNECTOR_PLACEHOLDER,
      stepNames: [],
    });
  }
  return required;
};

export interface WorkflowMigrationTableProps {
  migrationStats: WorkflowMigrationStats;
  refetchData: () => void;
}

export const WorkflowMigrationTable = React.memo<WorkflowMigrationTableProps>(
  ({ migrationStats, refetchData }) => {
    const { application } = useKibana().services;
    const { addSuccess, addError } = useAppToasts();
    const { canCreate, canExecute } = useWorkflowsMigrationPrivileges();

    const { data, isLoading } = useGetMigrationWorkflows({
      migrationId: migrationStats.id,
      page: 0,
      perPage: 100,
    });

    const [previewItem, setPreviewItem] = useState<WorkflowMigrationWorkflow | undefined>();
    const [connectorSelections, setConnectorSelections] = useState<ConnectorSelections>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingAndRunning, setIsSavingAndRunning] = useState(false);

    const items = data?.migrationWorkflows ?? [];
    const total = data?.total ?? 0;

    const previewYaml = previewItem?.elastic_workflow?.yaml ?? '';
    const requiredConnectors = useMemo(
      () => requiredConnectorsFromYaml(previewYaml),
      [previewYaml]
    );
    const resolvedYaml = useMemo(
      () => resolveConnectorPlaceholders(previewYaml, connectorSelections),
      [connectorSelections, previewYaml]
    );
    const hasUnresolvedPlaceholders = hasUnresolvedConnectorPlaceholders(resolvedYaml);

    const navigateToWorkflow = useCallback(
      (workflowId: string, executionId?: string) => {
        const path =
          executionId != null
            ? `/${workflowId}?tab=executions&executionId=${executionId}`
            : `/${workflowId}`;
        application.navigateToApp('workflows', { path });
      },
      [application]
    );

    const closePreview = useCallback(() => {
      setPreviewItem(undefined);
      setConnectorSelections({});
    }, []);

    const onSave = useCallback(async () => {
      if (!resolvedYaml) {
        return;
      }
      setIsSaving(true);
      try {
        const workflow = await saveTranslatedWorkflow({ yaml: resolvedYaml });
        addSuccess(pageI18n.SAVE_SUCCESS);
        refetchData();
        closePreview();
        navigateToWorkflow(workflow.id);
      } catch (error) {
        addError(error, { title: pageI18n.SAVE_ERROR });
      } finally {
        setIsSaving(false);
      }
    }, [addError, addSuccess, closePreview, navigateToWorkflow, refetchData, resolvedYaml]);

    const onSaveAndRun = useCallback(async () => {
      if (!resolvedYaml) {
        return;
      }
      setIsSavingAndRunning(true);
      try {
        const { workflow, execution } = await saveAndRunTranslatedWorkflow({
          yaml: resolvedYaml,
        });
        addSuccess(pageI18n.SAVE_AND_RUN_SUCCESS);
        refetchData();
        closePreview();
        navigateToWorkflow(workflow.id, execution.workflowExecutionId);
      } catch (error) {
        addError(error, { title: pageI18n.SAVE_ERROR });
      } finally {
        setIsSavingAndRunning(false);
      }
    }, [addError, addSuccess, closePreview, navigateToWorkflow, refetchData, resolvedYaml]);

    const columns = useMemo<Array<EuiBasicTableColumn<WorkflowMigrationWorkflow>>>(
      () => [
        {
          field: 'original_workflow.title',
          name: i18n.COLUMN_TITLE,
          truncateText: true,
          render: (_: unknown, item) =>
            item.elastic_workflow?.title ?? item.original_workflow.title,
        },
        {
          field: 'status',
          name: i18n.COLUMN_STATUS,
          width: '120px',
        },
        {
          field: 'translation_result',
          name: i18n.COLUMN_TRANSLATION,
          width: '140px',
          render: (result: string | undefined) => result ?? '—',
        },
        {
          name: i18n.COLUMN_ACTIONS,
          width: '140px',
          actions: [
            {
              name: i18n.PREVIEW_YAML,
              description: i18n.PREVIEW_YAML,
              icon: 'eye',
              type: 'icon',
              available: (item) => Boolean(item.elastic_workflow?.yaml),
              onClick: (item) => {
                setConnectorSelections({});
                setPreviewItem(item);
              },
              'data-test-subj': 'previewWorkflowYamlButton',
            },
          ],
        },
      ],
      []
    );

    if (isLoading) {
      return <CenteredLoadingSpinner />;
    }

    return (
      <>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h2>{i18n.TABLE_TITLE}</h2>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              {i18n.TABLE_CAPTION(total)}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiBasicTable
          data-test-subj="workflowMigrationTable"
          items={items}
          columns={columns}
          tableLayout="auto"
        />

        {previewItem != null && (
          <EuiModal onClose={closePreview} maxWidth={900} data-test-subj="workflowYamlPreviewModal">
            <EuiModalHeader>
              <EuiModalHeaderTitle>
                {previewItem.elastic_workflow?.title ?? previewItem.original_workflow.title}
              </EuiModalHeaderTitle>
            </EuiModalHeader>
            <EuiModalBody>
              {!previewYaml ? (
                <EuiText>{i18n.NO_YAML}</EuiText>
              ) : (
                <>
                  {requiredConnectors.length > 0 && (
                    <>
                      <RequiredConnectorsPanel
                        requiredConnectors={requiredConnectors}
                        selections={connectorSelections}
                        onSelectionsChange={setConnectorSelections}
                        hasUnresolvedPlaceholders={hasUnresolvedPlaceholders}
                      />
                      <EuiSpacer size="m" />
                    </>
                  )}
                  <EuiCodeBlock language="yaml" isCopyable overflowHeight={400}>
                    {resolvedYaml}
                  </EuiCodeBlock>
                </>
              )}
            </EuiModalBody>
            <EuiModalFooter>
              <EuiButtonEmpty onClick={closePreview}>{i18n.CLOSE_PREVIEW}</EuiButtonEmpty>
              {canCreate && previewYaml && (
                <EuiButton
                  onClick={() => {
                    void onSave();
                  }}
                  isLoading={isSaving}
                  disabled={hasUnresolvedPlaceholders || isSavingAndRunning}
                  data-test-subj="saveTranslatedWorkflowFromTable"
                >
                  {i18n.SAVE_WORKFLOW}
                </EuiButton>
              )}
              {canCreate && canExecute && previewYaml && (
                <EuiButton
                  fill
                  onClick={() => {
                    void onSaveAndRun();
                  }}
                  isLoading={isSavingAndRunning}
                  disabled={hasUnresolvedPlaceholders || isSaving}
                  data-test-subj="saveAndRunTranslatedWorkflowFromTable"
                >
                  {i18n.SAVE_AND_RUN_WORKFLOW}
                </EuiButton>
              )}
            </EuiModalFooter>
          </EuiModal>
        )}
      </>
    );
  }
);
WorkflowMigrationTable.displayName = 'WorkflowMigrationTable';
