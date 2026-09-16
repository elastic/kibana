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
  EuiCallOut,
  EuiCodeBlock,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type {
  MigrationReportMappedEntry,
  MigrationReportSkippedEntry,
} from '../../../../common/siem_migrations/parsers/tines';
import type { TranslateWorkflowResponse } from '../../../../common/siem_migrations/workflows/types';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../common/lib/kibana';
import { downloadBlob } from '../../../common/utils/download_blob';
import { saveAndRunTranslatedWorkflow, saveTranslatedWorkflow } from '../api';
import { useWorkflowsMigrationPrivileges } from '../hooks/use_workflows_migration_privileges';
import type { ConnectorSelections } from '../utils/resolve_connector_placeholders';
import {
  hasUnresolvedConnectorPlaceholders,
  resolveConnectorPlaceholders,
} from '../utils/resolve_connector_placeholders';
import { RequiredConnectorsPanel } from './required_connectors_panel';
import * as i18n from '../pages/translations';

export interface MigrationResultProps {
  result: TranslateWorkflowResponse;
  fileName?: string;
  onSaved?: () => void;
}

export const MigrationResult = React.memo<MigrationResultProps>(
  ({ result, fileName, onSaved }) => {
    const { yaml, report, validation } = result;
    const { application } = useKibana().services;
    const { addSuccess, addError } = useAppToasts();
    const { canCreate, canExecute } = useWorkflowsMigrationPrivileges();
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingAndRunning, setIsSavingAndRunning] = useState(false);
    const [connectorSelections, setConnectorSelections] = useState<ConnectorSelections>({});

    const requiredConnectors = report.requiredConnectors ?? [];

    const resolvedYaml = useMemo(
      () => resolveConnectorPlaceholders(yaml, connectorSelections),
      [connectorSelections, yaml]
    );

    const hasUnresolvedPlaceholders = hasUnresolvedConnectorPlaceholders(resolvedYaml);

    const onDownload = useCallback(() => {
      const blob = new Blob([resolvedYaml], { type: 'text/yaml' });
      const downloadName = (fileName ?? 'translated-workflow').replace(/\.json$/i, '') + '.yaml';
      downloadBlob(blob, downloadName);
    }, [fileName, resolvedYaml]);

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

    const onSave = useCallback(async () => {
      setIsSaving(true);
      try {
        const workflow = await saveTranslatedWorkflow({ yaml: resolvedYaml });
        addSuccess(i18n.SAVE_SUCCESS);
        onSaved?.();
        navigateToWorkflow(workflow.id);
      } catch (error) {
        addError(error, { title: i18n.SAVE_ERROR });
      } finally {
        setIsSaving(false);
      }
    }, [addError, addSuccess, navigateToWorkflow, onSaved, resolvedYaml]);

    const onSaveAndRun = useCallback(async () => {
      setIsSavingAndRunning(true);
      try {
        const { workflow, execution } = await saveAndRunTranslatedWorkflow({
          yaml: resolvedYaml,
        });
        addSuccess(i18n.SAVE_AND_RUN_SUCCESS);
        onSaved?.();
        navigateToWorkflow(workflow.id, execution.workflowExecutionId);
      } catch (error) {
        addError(error, { title: i18n.SAVE_ERROR });
      } finally {
        setIsSavingAndRunning(false);
      }
    }, [addError, addSuccess, navigateToWorkflow, onSaved, resolvedYaml]);

    const mappedColumns = useMemo<Array<EuiBasicTableColumn<MigrationReportMappedEntry>>>(
      () => [
        { field: 'agentName', name: i18n.COLUMN_AGENT_NAME },
        { field: 'agentType', name: i18n.COLUMN_AGENT_TYPE },
        { field: 'stepName', name: i18n.COLUMN_STEP_NAME },
        { field: 'elasticType', name: i18n.COLUMN_ELASTIC_TYPE },
      ],
      []
    );

    const skippedColumns = useMemo<Array<EuiBasicTableColumn<MigrationReportSkippedEntry>>>(
      () => [
        { field: 'agentName', name: i18n.COLUMN_AGENT_NAME },
        { field: 'agentType', name: i18n.COLUMN_AGENT_TYPE },
        { field: 'stepName', name: i18n.COLUMN_STEP_NAME },
        { field: 'reason', name: i18n.COLUMN_REASON },
      ],
      []
    );

    const canSave = canCreate && validation.valid;
    const canSaveAndRun = canCreate && canExecute && validation.valid;

    return (
      <div data-test-subj="tinesWorkflowMigrationResult">
        <EuiCallOut
          color={validation.valid ? 'success' : 'danger'}
          iconType={validation.valid ? 'check' : 'error'}
          title={validation.valid ? i18n.VALIDATION_SUCCESS : i18n.VALIDATION_FAILURE}
          data-test-subj="tinesWorkflowValidationCallout"
        >
          {!validation.valid && validation.errors != null && validation.errors.length > 0 && (
            <ul>
              {validation.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </EuiCallOut>

        {(!canCreate || !canExecute) && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              color="warning"
              iconType="lock"
              title={i18n.MISSING_WORKFLOWS_PRIVILEGES}
              data-test-subj="missingWorkflowsPrivilegesCallout"
            />
          </>
        )}

        {requiredConnectors.length > 0 ? (
          <>
            <EuiSpacer size="m" />
            <RequiredConnectorsPanel
              requiredConnectors={requiredConnectors}
              selections={connectorSelections}
              onSelectionsChange={setConnectorSelections}
              hasUnresolvedPlaceholders={hasUnresolvedPlaceholders}
            />
          </>
        ) : (
          hasUnresolvedPlaceholders && (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut
                color="warning"
                iconType="warning"
                title={i18n.CONNECTOR_PLACEHOLDER_WARNING}
                data-test-subj="connectorPlaceholderWarningCallout"
              />
            </>
          )
        )}

        <EuiSpacer size="l" />

        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h2>{i18n.YAML_PREVIEW_TITLE}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <EuiCopy textToCopy={resolvedYaml}>
                  {(copy) => (
                    <EuiButtonEmpty
                      iconType="copyClipboard"
                      onClick={copy}
                      size="s"
                      data-test-subj="copyWorkflowYamlButton"
                    >
                      {i18n.COPY_YAML}
                    </EuiButtonEmpty>
                  )}
                </EuiCopy>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  iconType="download"
                  onClick={onDownload}
                  size="s"
                  data-test-subj="downloadWorkflowYamlButton"
                >
                  {i18n.DOWNLOAD_YAML}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  iconType="save"
                  onClick={onSave}
                  size="s"
                  isLoading={isSaving}
                  disabled={!canSave || isSavingAndRunning}
                  data-test-subj="saveWorkflowButton"
                >
                  {i18n.SAVE_TO_WORKFLOWS}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  iconType="play"
                  onClick={onSaveAndRun}
                  size="s"
                  isLoading={isSavingAndRunning}
                  disabled={!canSaveAndRun || isSaving}
                  data-test-subj="saveAndRunWorkflowButton"
                >
                  {i18n.SAVE_AND_RUN}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        <EuiCodeBlock
          data-test-subj="workflowYamlPreview"
          fontSize="s"
          isCopyable
          language="yaml"
          overflowHeight={400}
          paddingSize="s"
        >
          {resolvedYaml}
        </EuiCodeBlock>

        <EuiSpacer size="l" />

        <EuiTitle size="s">
          <h2>{i18n.REPORT_TITLE}</h2>
        </EuiTitle>

        <EuiSpacer size="m" />

        <EuiTitle size="xs">
          <h3>{i18n.MAPPED_TITLE}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiBasicTable
          data-test-subj="mappedAgentsTable"
          items={report.mapped}
          columns={mappedColumns}
          tableLayout="auto"
        />

        {report.skipped.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiTitle size="xs">
              <h3>{i18n.SKIPPED_TITLE}</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiBasicTable
              data-test-subj="skippedAgentsTable"
              items={report.skipped}
              columns={skippedColumns}
              tableLayout="auto"
            />
          </>
        )}

        {report.warnings.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiTitle size="xs">
              <h3>{i18n.WARNINGS_TITLE}</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiCallOut color="warning" data-test-subj="migrationWarningsCallout">
              <ul>
                {report.warnings.map((warning) => (
                  <li key={warning}>
                    <EuiText size="s">{warning}</EuiText>
                  </li>
                ))}
              </ul>
            </EuiCallOut>
          </>
        )}
      </div>
    );
  }
);
MigrationResult.displayName = 'MigrationResult';
