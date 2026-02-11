/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiBadge, EuiButton, EuiFlexGroup, EuiFlexItem, EuiButtonIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { FormInfoField } from '@kbn/search-shared-ui';
import { i18n } from '@kbn/i18n';
import { ApiKeyFlyoutWrapper, useSearchApiKey, Status } from '@kbn/search-api-keys-components';
import { useQueryClient } from '@kbn/react-query';
import { useKibana } from '../hooks/use_kibana';
import { QueryKeys } from '../constants';

interface ApiKeyFormProps {
  hasTitle?: boolean;
}

const API_KEY_MASK = '•'.repeat(60);

interface ApiKeyFormContentProps {
  apiKey: string | null;
  toggleApiKeyVisibility: () => void;
  updateApiKey: ({ id, encoded }: { id: string; encoded: string }) => void;
  status: Status;
  manageKeysLink?: string;
}

// TODO: Instead of this component, use the shared ApiKeyForm from @kbn/search-api-keys-components
//   or remove after getting started page is complete.
const ApiKeyFormContent = ({
  apiKey,
  status,
  toggleApiKeyVisibility,
  updateApiKey,
  manageKeysLink,
}: ApiKeyFormContentProps) => {
  const [showFlyout, setShowFlyout] = useState(false);

  return apiKey ? (
    <FormInfoField
      value={status === Status.showPreviewKey ? apiKey : API_KEY_MASK}
      copyValue={apiKey}
      dataTestSubj="searchHomepageApiKeyFormAPIKey"
      copyValueDataTestSubj="searchHomepageAPIKeyButtonCopy"
      actions={[
        <EuiButtonIcon
          size="s"
          iconType={status === Status.showPreviewKey ? 'eyeClosed' : 'eye'}
          color="text"
          display="empty"
          onClick={toggleApiKeyVisibility}
          data-test-subj="searchHomepageShowAPIKeyButton"
          aria-label={
            status === Status.showPreviewKey
              ? i18n.translate('xpack.searchHomepage.apiKeyForm.hideApiKey', {
                  defaultMessage: 'Hide API key',
                })
              : i18n.translate('xpack.searchHomepage.apiKeyForm.showApiKey', {
                  defaultMessage: 'Show API key',
                })
          }
        />,
        <EuiButtonIcon
          size="s"
          iconType="gear"
          display="empty"
          color="text"
          href={manageKeysLink}
          target="_blank"
          aria-label={i18n.translate('xpack.searchHomepage.apiKeyForm.manageApiKeys', {
            defaultMessage: 'Manage API keys',
          })}
          data-test-subj="manageApiKeysButton"
        />,
      ]}
    />
  ) : (
    <EuiFlexGroup alignItems="center" gutterSize="s" justifyContent="flexStart">
      <EuiFlexItem grow={0}>
        <EuiButton
          color="primary"
          size="s"
          iconSide="left"
          iconType="key"
          onClick={() => setShowFlyout(true)}
          data-test-subj="createApiKeyButton"
        >
          <FormattedMessage
            id="xpack.searchHomepage.apiKeyForm.createButton"
            defaultMessage="Create API key"
          />
        </EuiButton>
        {showFlyout && (
          <ApiKeyFlyoutWrapper
            onCancel={() => setShowFlyout(false)}
            onSuccess={({ id, encoded }) => {
              updateApiKey({ id, encoded });
              setShowFlyout(false);
            }}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const ApiKeysUserPrivilegesError = () => (
  <EuiFlexGroup alignItems="center" gutterSize="s" justifyContent="flexStart" responsive={false}>
    <EuiFlexItem grow={0}>
      <EuiBadge data-test-subj="apiKeyFormNoUserPrivileges">
        {i18n.translate('xpack.searchHomepage.apiKeyForm.noUserPrivileges', {
          defaultMessage: 'Contact an administrator to manage API keys',
        })}
      </EuiBadge>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const ApiKeyForm: React.FC<ApiKeyFormProps> = () => {
  const { apiKey, status, updateApiKey, toggleApiKeyVisibility } = useSearchApiKey();
  const { share } = useKibana().services;
  const locator = share?.url?.locators.get('MANAGEMENT_APP_LOCATOR');
  const manageKeysLink = locator?.useUrl({ sectionId: 'security', appId: 'api_keys' });
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.invalidateQueries([QueryKeys.ApiKey]);
  }, [apiKey, queryClient]);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        {status === Status.showUserPrivilegesError ? (
          <ApiKeysUserPrivilegesError />
        ) : (
          <ApiKeyFormContent
            apiKey={apiKey}
            status={status}
            updateApiKey={updateApiKey}
            toggleApiKeyVisibility={toggleApiKeyVisibility}
            manageKeysLink={manageKeysLink}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
