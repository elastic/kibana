/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { FormInfoField } from '@kbn/search-shared-ui';
import { i18n } from '@kbn/i18n';
import { ApiKeyFlyoutWrapper, useSearchApiKey, Status } from '@kbn/search-api-keys-components';
import { useGetApiKeys } from '../hooks/api/use_api_key';
import { useKibana } from '../hooks/use_kibana';

interface ApiKeyFormProps {
  hasTitle?: boolean;
}

const API_KEY_MASK = '•'.repeat(60);

export const ApiKeyForm: React.FC<ApiKeyFormProps> = () => {
  const { share } = useKibana().services;
  const { apiKey, status, updateApiKey, toggleApiKeyVisibility } = useSearchApiKey();
  const { data } = useGetApiKeys();
  const [showFlyout, setShowFlyout] = useState(false);
  const locator = share?.url?.locators.get('MANAGEMENT_APP_LOCATOR');
  const manageKeysLink = locator?.useUrl({ sectionId: 'security', appId: 'api_keys' });

  if (status === Status.showUserPrivilegesError) {
    return (
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        justifyContent="flexStart"
        responsive={false}
      >
        <EuiFlexItem grow={0}>
          <EuiBadge data-test-subj="apiKeyFormNoUserPrivileges">
            {i18n.translate('xpack.searchHomepage.apiKeyForm.noUserPrivileges', {
              defaultMessage: 'Contact an administrator to manage API keys',
            })}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

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
        <EuiButtonEmpty iconType="gear" href={manageKeysLink} data-test-subj="manageApiKeysButton">
          Manage API keys
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge
          data-test-subj="activeApiKeysBadge"
          color={(data?.apiKeys?.length ?? 0) > 0 ? 'success' : 'warning'}
        >
          {data?.apiKeys?.length ?? 0} active
        </EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
