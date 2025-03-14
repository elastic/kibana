/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';

import { useActions, useValues } from 'kea';

import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiForm } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { UnsavedChangesPrompt } from '../../../../../shared/unsaved_changes_prompt';

import { ConnectorFilteringLogic } from './connector_filtering_logic';

export const ConnectorSyncRulesForm: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const { saveDraftFilteringRules, setIsEditing } = useActions(ConnectorFilteringLogic);
  const { hasJsonValidationError, isEditing, isLoading } = useValues(ConnectorFilteringLogic);

  return (
    <EuiFlexGroup direction="column">
      <UnsavedChangesPrompt
        hasUnsavedChanges={isEditing}
        messageText={i18n.translate(
          'xpack.enterpriseSearch.index.connector.syncRules.unsavedChanges',
          {
            defaultMessage: 'Your changes have not been saved. Are you sure you want to leave?',
          }
        )}
      />
      <EuiFlexItem>
        <EuiForm>{children}</EuiForm>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="spaceBetween">
          {isEditing && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-telemetry-id="entSearchContent-connector-syncRules-editRules-cancelEditing"
                onClick={() => {
                  setIsEditing(!isEditing);
                }}
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.index.connector.syncRules.cancelEditingFilteringDraft',
                  {
                    defaultMessage: 'Cancel',
                  }
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiButton
              data-telemetry-id="entSearchContent-connector-syncRules-editRules-saveAndValidate"
              disabled={hasJsonValidationError}
              isLoading={isLoading}
              onClick={saveDraftFilteringRules}
            >
              {i18n.translate(
                'xpack.enterpriseSearch.index.connector.syncRules.validateDraftTitle',
                {
                  defaultMessage: 'Save and validate draft',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
