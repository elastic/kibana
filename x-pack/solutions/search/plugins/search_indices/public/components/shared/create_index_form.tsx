/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { UserStartPrivilegesResponse } from '../../../common';

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
            disabled={userPrivileges?.privileges?.canCreateIndex === false}
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
                userPrivileges?.privileges?.canCreateIndex === false ? (
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
                  userPrivileges?.privileges?.canCreateIndex === false ||
                  indexNameHasError ||
                  isLoading
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
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="documents" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText color="subdued" size="s">
              <p>
                <FormattedMessage
                  id="xpack.searchIndices.shared.createIndex.fileUpload.text"
                  defaultMessage="Already have some data? {link}"
                  values={{
                    link: (
                      <EuiLink data-test-subj="uploadFileLink" onClick={onFileUpload}>
                        {i18n.translate('xpack.searchIndices.shared.createIndex.fileUpload.link', {
                          defaultMessage: 'Upload a file',
                        })}
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
};
