/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { FormInfoField } from '@kbn/search-shared-ui';
import { i18n } from '@kbn/i18n';
import { ApiKeyFlyoutWrapper, useSearchApiKey, Status } from '@kbn/search-api-keys-components';
import { useQueryClient } from '@tanstack/react-query';
import { useGetApiKeys } from '../hooks/api/use_api_key';
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
const ApiKeyFormContent = ({
  apiKey,
  status,
  toggleApiKeyVisibility,
  updateApiKey,
  manageKeysLink,
}: ApiKeyFormContentProps) => {
  const [showFlyout, setShowFlyout] = useState(false);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" justifyContent="flexStart" responsive={false}>
      {apiKey ? (
        <EuiFlexItem grow={0}>
          <FormInfoField
            value={status === Status.showPreviewKey ? apiKey : API_KEY_MASK}
            copyValue={apiKey}
            dataTestSubj="searchHomepageApiKeyFormAPIKey"
            copyValueDataTestSubj="searchHomepageAPIKeyButtonCopy"
            actions={[
              <EuiButtonIcon
                iconType={status === Status.showPreviewKey ? 'eyeClosed' : 'eye'}
                color="text"
                onClick={toggleApiKeyVisibility}
                data-test-subj="searchHomepageShowAPIKeyButton"
                aria-label={i18n.translate('xpack.searchHomepage.apiKeyForm.showApiKey', {
                  defaultMessage: 'Show API key',
                })}
              />,
            ]}
          />
        </EuiFlexItem>
      ) : (
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
      )}
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="s"
          iconType="gear"
          href={manageKeysLink}
          data-test-subj="manageApiKeysButton"
        >
          <FormattedMessage
            id="xpack.searchHomepage.apiKeyForm.manageKeysButton"
            defaultMessage="Manage"
          />
        </EuiButtonEmpty>
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
  const { data } = useGetApiKeys();
  const { share } = useKibana().services;
  const locator = share?.url?.locators.get('MANAGEMENT_APP_LOCATOR');
  const manageKeysLink = locator?.useUrl({ sectionId: 'security', appId: 'api_keys' });
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.invalidateQueries([QueryKeys.ApiKey]);
  }, [apiKey, queryClient]);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiTitle size="xxs">
            <span>
              {i18n.translate('xpack.searchHomepage.connectToElasticsearch.apiKeysLabel', {
                defaultMessage: 'API keys',
              })}
            </span>
          </EuiTitle>
          <EuiFlexItem grow={false}>
            <EuiBadge
              data-test-subj="activeApiKeysBadge"
              color={(data?.apiKeys?.length ?? 0) > 0 ? 'success' : 'warning'}
            >
              {data?.apiKeys?.length ?? 0} active
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
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
