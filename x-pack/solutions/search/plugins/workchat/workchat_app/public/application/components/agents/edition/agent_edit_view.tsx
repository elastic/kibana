/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import {
  EuiButton,
  EuiFieldText,
  EuiTextArea,
  EuiFlexGroup,
  EuiPanel,
  EuiFlexItem,
  EuiSpacer,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiDescribedFormGroup,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useNavigation } from '../../../hooks/use_navigation';
import { useKibana } from '../../../hooks/use_kibana';
import { useBreadcrumb } from '../../../hooks/use_breadcrumbs';
import { useAgentEdition } from '../../../hooks/use_agent_edition';
import { appPaths } from '../../../app_paths';
import { agentLabels } from '../i18n';

interface AgentEditViewProps {
  agentId: string | undefined;
}

export const AgentEditView: React.FC<AgentEditViewProps> = ({ agentId }) => {
  const { navigateToWorkchatUrl, createWorkchatUrl } = useNavigation();
  const {
    services: { notifications },
  } = useKibana();

  const breadcrumb = useMemo(() => {
    return [
      { text: agentLabels.breadcrumb.agentsPill, href: createWorkchatUrl(appPaths.agents.list) },
      agentId
        ? { text: agentLabels.breadcrumb.editAgentPill }
        : { text: agentLabels.breadcrumb.createAgensPill },
    ];
  }, [agentId, createWorkchatUrl]);

  useBreadcrumb(breadcrumb);

  const handleCancel = useCallback(() => {
    navigateToWorkchatUrl('/agents');
  }, [navigateToWorkchatUrl]);

  const onSaveSuccess = useCallback(() => {
    notifications.toasts.addSuccess(
      agentId
        ? agentLabels.notifications.agentUpdatedToastText
        : agentLabels.notifications.agentCreatedToastText
    );
    navigateToWorkchatUrl('/agents');
  }, [agentId, navigateToWorkchatUrl, notifications]);

  const { editState, setFieldValue, submit, isSubmitting } = useAgentEdition({
    agentId,
    onSaveSuccess,
  });

  const onSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isSubmitting) {
        return;
      }
      submit();
    },
    [submit, isSubmitting]
  );

  return (
    <KibanaPageTemplate panelled>
      <KibanaPageTemplate.Header
        pageTitle={
          agentId ? agentLabels.editView.editAgentTitle : agentLabels.editView.createAgentTitle
        }
      />

      <KibanaPageTemplate.Section grow={false} paddingSize="m">
        <EuiPanel hasShadow={false} hasBorder={true}>
          <EuiForm component="form" fullWidth onSubmit={onSubmit}>
            <EuiDescribedFormGroup
              ratio="third"
              title={<h3>Base configuration</h3>}
              description="Configure your agent"
            >
              <EuiFormRow label="Name">
                <EuiFieldText
                  data-test-subj="workchatAppAgentEditViewFieldText"
                  name="name"
                  value={editState.name}
                  onChange={(e) => setFieldValue('name', e.target.value)}
                />
              </EuiFormRow>
              <EuiFormRow label="Description">
                <EuiFieldText
                  data-test-subj="workchatAppAgentEditViewFieldText"
                  name="description"
                  value={editState.description}
                  onChange={(e) => setFieldValue('description', e.target.value)}
                />
              </EuiFormRow>
              <EuiFormRow label="Visibility">
                <EuiSelect
                  data-test-subj="workchatAppAgentEditViewSelect"
                  name="public"
                  value={editState.public ? 'public' : 'private'}
                  options={[
                    { value: 'public', text: 'Public - everyone can use it' },
                    { value: 'private', text: 'Private - only you can use it' },
                  ]}
                  onChange={(e) => setFieldValue('public', e.target.value === 'public')}
                />
              </EuiFormRow>
            </EuiDescribedFormGroup>

            <EuiSpacer />

            <EuiDescribedFormGroup
              ratio="third"
              title={<h3>Customization</h3>}
              description="Optional parameters to customize the agent"
            >
              <EuiFormRow label="System prompt">
                <EuiTextArea
                  data-test-subj="workchatAppAgentEditViewTextArea"
                  name="systemPrompt"
                  value={editState.systemPrompt}
                  onChange={(e) => setFieldValue('systemPrompt', e.target.value)}
                />
              </EuiFormRow>
            </EuiDescribedFormGroup>

            <EuiSpacer />

            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="workchatAppAgentEditViewCancelButton"
                  type="button"
                  iconType="framePrevious"
                  color="warning"
                  onClick={handleCancel}
                >
                  {agentLabels.editView.cancelButtonLabel}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="workchatAppAgentEditViewSaveButton"
                  type="submit"
                  iconType="save"
                  fill
                  disabled={isSubmitting}
                >
                  {agentLabels.editView.saveButtonLabel}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiForm>
        </EuiPanel>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
