/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
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
  EuiDescribedFormGroup,
  EuiSelect,
  EuiConfirmModal,
  EuiButtonEmpty,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { IntegrationType } from '@kbn/wci-common';
import { useNavigation } from '../../../hooks/use_navigation';
import { useKibana } from '../../../hooks/use_kibana';
import { useBreadcrumb } from '../../../hooks/use_breadcrumbs';
import { useIntegrationEdit } from '../../../hooks/use_integration_edit';
import { useIntegrationDelete } from '../../../hooks/use_integration_delete';
import { integrationLabels } from '../i18n';
import { integrationTypeToLabel } from '../utils';

interface IntegrationEditViewProps {
  integrationId: string | undefined;
}

export const IntegrationEditView: React.FC<IntegrationEditViewProps> = ({ integrationId }) => {
  const { navigateToWorkchatUrl } = useNavigation();
  const {
    services: { notifications },
  } = useKibana();
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const breadcrumb = useMemo(() => {
    return [
      { text: 'WorkChat' },
      { text: integrationLabels.breadcrumb.integrationsPill },
      integrationId
        ? { text: integrationLabels.breadcrumb.editIntegrationPill }
        : { text: integrationLabels.breadcrumb.createIntegrationPill },
    ];
  }, [integrationId]);

  useBreadcrumb(breadcrumb);

  const handleCancel = useCallback(() => {
    navigateToWorkchatUrl('/integrations');
  }, [navigateToWorkchatUrl]);

  const onSaveSuccess = useCallback(() => {
    notifications.toasts.addSuccess(
      integrationId
        ? integrationLabels.notifications.integrationUpdatedToastText
        : integrationLabels.notifications.integrationCreatedToastText
    );
    navigateToWorkchatUrl('/integrations');
  }, [integrationId, navigateToWorkchatUrl, notifications]);

  const onSaveError = useCallback(
    (err: Error) => {
      notifications.toasts.addError(err, {
        title: 'Error',
      });
    },
    [notifications]
  );

  const { editState, setFieldValue, submit, isSubmitting } = useIntegrationEdit({
    integrationId,
    onSaveSuccess,
    onSaveError,
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

  const integrationTypes = [
    { value: '', text: 'Pick a type' },
    ...Object.values(IntegrationType).map((type) => ({
      value: type,
      text: integrationTypeToLabel(type),
    })),
  ];

  const updateConfiguration = (configuration: string) => {
    setFieldValue('configuration', JSON.parse(configuration));
  };

  const onDeleteSuccess = useCallback(() => {
    notifications.toasts.addSuccess(integrationLabels.notifications.integrationDeletedToastText);
    navigateToWorkchatUrl('/integrations');
  }, [navigateToWorkchatUrl, notifications]);

  const onDeleteError = useCallback(
    (err: Error) => {
      notifications.toasts.addError(err, {
        title: 'Error deleting integration',
      });
    },
    [notifications]
  );

  const { deleteIntegration, isDeleting } = useIntegrationDelete({
    onDeleteSuccess,
    onDeleteError,
  });

  const handleDelete = useCallback(() => {
    if (integrationId) {
      deleteIntegration(integrationId);
    }
    setIsDeleteModalVisible(false);
  }, [deleteIntegration, integrationId]);

  const showDeleteModal = () => {
    setIsDeleteModalVisible(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalVisible(false);
  };

  return (
    <KibanaPageTemplate panelled>
      <KibanaPageTemplate.Header
        pageTitle={
          integrationId
            ? integrationLabels.editView.editIntegrationTitle
            : integrationLabels.editView.createIntegrationTitle
        }
      />

      <KibanaPageTemplate.Section grow={false} paddingSize="m">
        <EuiPanel hasShadow={false} hasBorder={true}>
          <EuiForm component="form" fullWidth onSubmit={onSubmit}>
            <EuiDescribedFormGroup
              ratio="third"
              title={<h3>Base configuration</h3>}
              description="Configure your integration"
            >
              <EuiFormRow label="Description">
                <EuiFieldText
                  data-test-subj="workchatAppIntegrationEditViewFieldText"
                  name="description"
                  value={editState.description}
                  onChange={(e) => setFieldValue('description', e.target.value)}
                />
              </EuiFormRow>
              <EuiFormRow label="Type">
                <EuiSelect
                  data-test-subj="workchatAppIntegrationEditViewSelect"
                  options={integrationTypes}
                  value={editState.type}
                  onChange={(e) => setFieldValue('type', e.target.value)}
                  disabled={!!integrationId}
                />
              </EuiFormRow>
            </EuiDescribedFormGroup>

            <EuiSpacer />

            <EuiDescribedFormGroup
              ratio="third"
              title={<h3>Integration Configuration</h3>}
              description="Configure the integration details"
            >
              <EuiFormRow label="Additional Configuration">
                <EuiTextArea
                  data-test-subj="workchatAppIntegrationEditViewAdditionalConfig"
                  placeholder="JSON configuration"
                  value={JSON.stringify(editState.configuration, null, 2)}
                  onChange={(e) => updateConfiguration(e.target.value)}
                />
              </EuiFormRow>
            </EuiDescribedFormGroup>

            <EuiSpacer />

            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiButton
                      data-test-subj="workchatAppIntegrationEditViewCancelButton"
                      type="button"
                      iconType="framePrevious"
                      color="warning"
                      onClick={handleCancel}
                    >
                      {integrationLabels.editView.cancelButtonLabel}
                    </EuiButton>
                  </EuiFlexItem>
                  {integrationId && (
                    <EuiFlexItem>
                      <EuiButtonEmpty
                        data-test-subj="workchatAppIntegrationEditViewDeleteButton"
                        color="danger"
                        onClick={showDeleteModal}
                        isLoading={isDeleting}
                      >
                        Delete
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="workchatAppIntegrationEditViewSaveButton"
                  type="submit"
                  iconType="save"
                  fill
                  disabled={isSubmitting}
                >
                  {integrationLabels.editView.saveButtonLabel}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiForm>

          {isDeleteModalVisible && (
            <EuiConfirmModal
              title="Delete integration"
              onCancel={closeDeleteModal}
              onConfirm={handleDelete}
              cancelButtonText="Cancel"
              confirmButtonText="Delete"
              buttonColor="danger"
              defaultFocusedButton="confirm"
            >
              <p>Are you sure you want to delete this integration? This action cannot be undone.</p>
            </EuiConfirmModal>
          )}
        </EuiPanel>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
