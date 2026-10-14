/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';

import { useKibana } from '../../../../../common/lib/kibana';
import { AttackDiscoveryEventTypes } from '../../../../../common/lib/telemetry';
import { useWorkflowEditorLink } from '../../../use_workflow_editor_link';
import { SYSTEM_VALIDATE_WORKFLOW_ID } from '../constants';
import { filterWorkflowsForValidation } from '../helpers/filter_workflows_for_step';
import { useListWorkflows } from '../hooks/use_list_workflows';
import { NoWorkflowsAvailable } from '../no_workflows_available';
import type { WorkflowItem } from '../types';
import { WorkflowPicker } from '../workflow_picker';
import * as i18n from '../translations';

/**
 * The sentinel value stored in workflow configuration when the user wants to
 * use the built-in default validation workflow. The server resolves this alias
 * to the real registered workflow UUID at generation time.
 */
const DEFAULT_VALIDATION_WORKFLOW_ID = 'default';

/**
 * The alias used by `useWorkflowEditorLink` to resolve the real validation
 * workflow UUID by its registered tag.
 */
const VALIDATE_WORKFLOW_ALIAS = 'attack-discovery-validate';

/**
 * The alias used by `useWorkflowEditorLink` to resolve the custom validation
 * example workflow, surfaced as a "View example" link so users can discover it.
 */
const CUSTOM_VALIDATION_EXAMPLE_ALIAS = 'attack-discovery-custom-validation-example';

export interface ValidationPanelProps {
  isInvalid?: boolean;
  onChange: (validationWorkflowId: string) => void;
  value: string;
}

const ValidationPanelComponent: React.FC<ValidationPanelProps> = ({
  isInvalid = false,
  onChange,
  value,
}) => {
  const { application, telemetry } = useKibana().services;
  const { data: workflows = [], isLoading } = useListWorkflows();
  const { resolvedWorkflowId: defaultValidateRealId } = useWorkflowEditorLink({
    workflowId: VALIDATE_WORKFLOW_ALIAS,
    workflowRunId: null,
  });
  const { editorUrl: customValidationExampleUrl } = useWorkflowEditorLink({
    workflowId: CUSTOM_VALIDATION_EXAMPLE_ALIAS,
    workflowRunId: null,
  });

  const workflowsAppUrl = useMemo(() => {
    try {
      return application.getUrlForApp('workflows') ?? '';
    } catch {
      return '';
    }
  }, [application]);

  const createWorkflowUrl = useMemo(
    () => (workflowsAppUrl !== '' ? `${workflowsAppUrl}/create` : ''),
    [workflowsAppUrl]
  );

  // Build the list of validation workflows, marking the real default if found.
  // If the real default validation workflow hasn't been registered yet (first run),
  // insert a fallback entry so the user always has a default option.
  const validationWorkflows: WorkflowItem[] = useMemo(() => {
    // Prefer the alias-resolved ID; fall back to the well-known system ID so
    // the real entry is recognised even before the alias has resolved.
    const defaultId = defaultValidateRealId ?? SYSTEM_VALIDATE_WORKFLOW_ID;

    const mapped = workflows.map((workflow) => ({
      description: workflow.description || workflow.name,
      enabled: workflow.enabled,
      id: workflow.id,
      isDefault: workflow.id === defaultId,
      managed: workflow.managed,
      name: workflow.name,
      tags: workflow.tags,
    }));

    const filtered = filterWorkflowsForValidation(mapped);

    if (filtered.some((w) => w.isDefault)) {
      return filtered;
    }

    // Fallback: the real workflow isn't in the list yet (first run before
    // managed workflows are installed). Insert an artificial entry that the
    // server will resolve at generation time.
    return [
      {
        description: i18n.DEFAULT_VALIDATION_WORKFLOW_DESCRIPTION,
        enabled: true,
        id: DEFAULT_VALIDATION_WORKFLOW_ID,
        isDefault: true,
        name: i18n.DEFAULT_VALIDATION_WORKFLOW_LABEL,
      },
      ...filtered,
    ];
  }, [defaultValidateRealId, workflows]);

  // Whether the picker offers any custom (non-default) validation workflow to
  // select. Based on the filtered picker list rather than the raw workflows so
  // that lists containing only non-selectable workflows (e.g. managed workflows
  // owned by other plugins) still surface the "no workflows available" state.
  const hasCustomWorkflows = useMemo(
    () => validationWorkflows.some((workflow) => !workflow.isDefault),
    [validationWorkflows]
  );

  const handleValidationWorkflowChange = useCallback(
    (workflowIds: string[]) => {
      const selectedId = workflowIds.length > 0 ? workflowIds[0] : '';

      telemetry.reportEvent(AttackDiscoveryEventTypes.ValidationWorkflowChanged, {
        is_default:
          selectedId === DEFAULT_VALIDATION_WORKFLOW_ID ||
          selectedId === SYSTEM_VALIDATE_WORKFLOW_ID ||
          selectedId === defaultValidateRealId,
      });

      onChange(selectedId);
    },
    [defaultValidateRealId, onChange, telemetry]
  );

  // Map the stored 'default' alias to the real workflow ID for display,
  // so the picker highlights the correct item in the list.
  const selectedWorkflowIds = useMemo(() => {
    if (!value) {
      return [];
    }

    if (value === DEFAULT_VALIDATION_WORKFLOW_ID) {
      const realId = defaultValidateRealId ?? SYSTEM_VALIDATE_WORKFLOW_ID;
      // Use the real ID only if it's actually in the list; otherwise keep
      // the sentinel ID so the picker highlights the synthetic fallback entry.
      const hasRealInList = validationWorkflows.some((w) => w.id === realId);
      return [hasRealInList ? realId : DEFAULT_VALIDATION_WORKFLOW_ID];
    }

    return [value];
  }, [defaultValidateRealId, validationWorkflows, value]);

  const helpText = useMemo(() => <>{i18n.VALIDATION_WORKFLOW_HELP}</>, []);

  const createWorkflowLink = createWorkflowUrl !== '' && (
    <EuiText size="xs">
      <EuiLink
        data-test-subj="createNewValidationWorkflow"
        external
        href={createWorkflowUrl}
        target="_blank"
      >
        {i18n.CREATE_NEW_WORKFLOW}
      </EuiLink>
    </EuiText>
  );

  const viewExampleLink = customValidationExampleUrl != null && (
    <EuiText size="xs">
      <EuiLink
        data-test-subj="viewValidationExampleWorkflow"
        external
        href={customValidationExampleUrl}
        target="_blank"
      >
        {i18n.VIEW_EXAMPLE}
      </EuiLink>
    </EuiText>
  );

  const labelAppend = (createWorkflowLink || viewExampleLink) && (
    <EuiFlexGroup gutterSize="m" justifyContent="flexEnd" responsive={false} wrap>
      {viewExampleLink && <EuiFlexItem grow={false}>{viewExampleLink}</EuiFlexItem>}
      {createWorkflowLink && <EuiFlexItem grow={false}>{createWorkflowLink}</EuiFlexItem>}
    </EuiFlexGroup>
  );

  return (
    <>
      <EuiFormRow
        fullWidth
        helpText={helpText}
        label={i18n.VALIDATION_WORKFLOW_LABEL}
        labelAppend={labelAppend}
      >
        <WorkflowPicker
          data-test-subj="validationWorkflowPicker"
          isInvalid={isInvalid}
          isLoading={isLoading}
          label={i18n.VALIDATION_WORKFLOW_LABEL}
          onChange={handleValidationWorkflowChange}
          placeholder={i18n.VALIDATION_WORKFLOW_PLACEHOLDER}
          required
          selectedWorkflowIds={selectedWorkflowIds}
          singleSelection
          workflows={validationWorkflows}
        />
      </EuiFormRow>
      {!isLoading && !hasCustomWorkflows && (
        <>
          <EuiSpacer size="s" />
          <NoWorkflowsAvailable agentBuilderUrl={workflowsAppUrl} />
        </>
      )}
    </>
  );
};

ValidationPanelComponent.displayName = 'ValidationPanel';

export const ValidationPanel = React.memo(ValidationPanelComponent);
