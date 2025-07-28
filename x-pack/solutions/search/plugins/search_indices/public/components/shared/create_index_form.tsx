/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { UserStartPrivilegesResponse } from '../../../common';
import { SampleDataPanel } from './sample_data_panel';
import { useIngestSampleData } from '../../hooks/use_ingest_data';
import { useUsageTracker } from '../../contexts/usage_tracker_context';
import { AnalyticsEvents } from '../../analytics/constants';
import { useKibana } from '../../hooks/use_kibana';

export interface CreateIndexFormProps {
  indexName: string;
  indexNameHasError: boolean;
  isLoading: boolean;
  onCreateIndex: (e: React.FormEvent<HTMLFormElement>) => void;
  onFileUpload: () => void;
  onIndexNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showAPIKeyCreateLabel: boolean;
  userPrivileges?: UserStartPrivilegesResponse;
}

export const CreateIndexForm = ({
  indexName,
  indexNameHasError,
  isLoading,
  onCreateIndex,
  onFileUpload,
  onIndexNameChange,
  showAPIKeyCreateLabel,
  userPrivileges,
}: CreateIndexFormProps) => {
  const { sampleDataIngest } = useKibana().services;
  const usageTracker = useUsageTracker();
  const { ingestSampleData, isLoading: isIngestingSampleData } = useIngestSampleData();
  const onIngestSampleData = useCallback(() => {
    usageTracker.click(AnalyticsEvents.createIndexIngestSampleDataClick);
    ingestSampleData();
  }, [usageTracker, ingestSampleData]);

  return (
    <>
      <EuiForm
        data-test-subj="createIndexUIView"
        fullWidth
        component="form"
        onSubmit={onCreateIndex}
      >
        <EuiFormRow
          label={i18n.translate('xpack.searchIndices.shared.createIndex.name.label', {
            defaultMessage: 'Name your index',
          })}
          helpText={i18n.translate('xpack.searchIndices.shared.createIndex.name.helpText', {
            defaultMessage:
              'Index names must be lowercase and can only contain hyphens and numbers',
          })}
          fullWidth
          isInvalid={indexNameHasError}
        >
          <EuiFieldText
            autoFocus
            fullWidth
            data-test-subj="indexNameField"
            name="indexName"
            value={indexName}
            isInvalid={indexNameHasError}
            disabled={userPrivileges?.privileges?.canManageIndex === false}
            onChange={onIndexNameChange}
            placeholder={i18n.translate('xpack.searchIndices.shared.createIndex.name.placeholder', {
              defaultMessage: 'Enter a name for your index',
            })}
          />
        </EuiFormRow>
        <EuiSpacer />
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={
                userPrivileges?.privileges?.canManageIndex === false ? (
                  <p>
                    {i18n.translate('xpack.searchIndices.shared.createIndex.permissionTooltip', {
                      defaultMessage: 'You do not have permission to create an index.',
                    })}
                  </p>
                ) : undefined
              }
            >
              <EuiButton
                fill
                color="primary"
                iconSide="left"
                iconType="sparkles"
                data-test-subj="createIndexBtn"
                disabled={
                  userPrivileges?.privileges?.canManageIndex === false ||
                  indexNameHasError ||
                  isLoading ||
                  isIngestingSampleData
                }
                isLoading={isLoading}
                type="submit"
              >
                {i18n.translate('xpack.searchIndices.shared.createIndex.action.text', {
                  defaultMessage: 'Create my index',
                })}
              </EuiButton>
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem>
            {showAPIKeyCreateLabel && (
              <EuiFlexGroup gutterSize="s">
                <EuiIcon size="m" type="key" color="subdued" />
                <EuiText size="s" data-test-subj="apiKeyLabel">
                  <p>
                    {i18n.translate(
                      'xpack.searchIndices.shared.createIndex.apiKeyCreation.description',
                      {
                        defaultMessage: "We'll create an API key for this index",
                      }
                    )}
                  </p>
                </EuiText>
              </EuiFlexGroup>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
      <EuiHorizontalRule margin="none" />
      <EuiPanel color="transparent" paddingSize="s">
        <EuiFlexGroup gutterSize="l" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center">
              <EuiFlexItem>
                <EuiText color="subdued" size="s">
                  <p>
                    <FormattedMessage
                      id="xpack.searchIndices.shared.createIndex.fileUpload.text"
                      defaultMessage="Already have some data?"
                    />
                  </p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  color="primary"
                  iconSide="left"
                  iconType="documents"
                  size="s"
                  data-test-subj="uploadFileLink"
                  onClick={onFileUpload}
                >
                  <FormattedMessage
                    id="xpack.searchIndices.shared.createIndex.fileUpload.link"
                    defaultMessage="Upload a file"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {sampleDataIngest && (
              <SampleDataPanel
                isLoading={isIngestingSampleData}
                onIngestSampleData={onIngestSampleData}
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
};
