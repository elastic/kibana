/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFormRow, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';

import { useKibana } from '../../../../../common/lib/kibana';
import { AttackDiscoveryEventTypes } from '../../../../../common/lib/telemetry';
import { useWorkflowEditorLink } from '../../../use_workflow_editor_link';
import { filterWorkflowsForAlertRetrieval } from '../helpers/filter_workflows_for_step';
import { useListWorkflows } from '../hooks/use_list_workflows';
import { NoWorkflowsAvailable } from '../no_workflows_available';
import * as i18n from '../translations';
import type { WorkflowConfigurationPanelProps, WorkflowItem } from '../types';
import { WorkflowPicker } from '../workflow_picker';

const WorkflowConfigurationPanelComponent: React.FC<WorkflowConfigurationPanelProps> = ({
  isInvalid = false,
  onChange,
  value,
}) => {
  const { application, telemetry } = useKibana().services;
  const { data: workflows = [], isLoading } = useListWorkflows();
  const { editorUrl: esqlExampleUrl } = useWorkflowEditorLink({
    workflowId: 'attack-discovery-esql-example',
    workflowRunId: null,
  });

  const agentBuilderUrl = useMemo(() => {
    try {
      return application.getUrlForApp('workflows') ?? '';
    } catch {
      return '';
    }
  }, [application]);

  const createWorkflowUrl = useMemo(
    () => (agentBuilderUrl !== '' ? `${agentBuilderUrl}/create` : ''),
    [agentBuilderUrl]
  );

  const workflowsWithDescription: WorkflowItem[] = useMemo(() => {
    const mapped = workflows.map((workflow) => ({
      description: workflow.description || workflow.name,
      enabled: workflow.enabled,
      id: workflow.id,
      name: workflow.name,
      tags: workflow.tags,
    }));

    return filterWorkflowsForAlertRetrieval(mapped);
  }, [workflows]);

  const handleAlertRetrievalWorkflowChange = useCallback(
    (workflowIds: string[]) => {
      telemetry.reportEvent(AttackDiscoveryEventTypes.AlertRetrievalWorkflowsChanged, {
        workflow_count: workflowIds.length,
      });

      onChange({
        ...value,
        alertRetrievalWorkflowIds: workflowIds,
      });
    },
    [onChange, telemetry, value]
  );

  const hasNoWorkflows = !isLoading && workflowsWithDescription.length === 0;

  const alertRetrievalLabel = i18n.getAlertRetrievalWorkflowsLabel(
    value.alertRetrievalWorkflowIds.length
  );

  const helpText = useMemo(
    () => (
      <>
        {i18n.ALERT_RETRIEVAL_WORKFLOWS_HELP}
        {esqlExampleUrl != null && (
          <>
            {' '}
            <EuiLink
              data-test-subj="esqlExampleWorkflowLink"
              external
              href={esqlExampleUrl}
              target="_blank"
            >
              {i18n.ESQL_EXAMPLE_LINK}
            </EuiLink>
          </>
        )}
      </>
    ),
    [esqlExampleUrl]
  );

  const labelAppend = createWorkflowUrl !== '' && (
    <EuiText size="xs">
      <EuiLink data-test-subj="createNewWorkflow" external href={createWorkflowUrl} target="_blank">
        {i18n.CREATE_NEW_WORKFLOW}
      </EuiLink>
    </EuiText>
  );

  return (
    <>
      <EuiFormRow
        fullWidth
        helpText={helpText}
        label={alertRetrievalLabel}
        labelAppend={labelAppend}
      >
        {hasNoWorkflows ? (
          <NoWorkflowsAvailable agentBuilderUrl={agentBuilderUrl} />
        ) : (
          <WorkflowPicker
            data-test-subj="alertRetrievalWorkflowPicker"
            isInvalid={isInvalid}
            isLoading={isLoading}
            label={alertRetrievalLabel}
            onChange={handleAlertRetrievalWorkflowChange}
            placeholder={i18n.ALERT_RETRIEVAL_WORKFLOWS_PLACEHOLDER}
            selectedWorkflowIds={value.alertRetrievalWorkflowIds}
            workflows={workflowsWithDescription}
          />
        )}
      </EuiFormRow>

      <EuiSpacer size="s" />
    </>
  );
};

WorkflowConfigurationPanelComponent.displayName = 'WorkflowConfigurationPanel';

export const WorkflowConfigurationPanel = React.memo(WorkflowConfigurationPanelComponent);
