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
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { FormInfoField } from '@kbn/search-shared-ui';
import { i18n } from '@kbn/i18n';
import { ApiKeyFlyoutWrapper, useSearchApiKey, Status } from '@kbn/search-api-keys-components';
import { useKibana } from '../hooks/use_kibana';

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
    <EuiFlexGroup alignItems="center" gutterSize="s" justifyContent="flexStart">
      {apiKey ? (
        <>
          <EuiFlexItem grow={false}>
            <span>
              <FormattedMessage
                id="xpack.searchHomepage.connectToElasticsearch.apiKeysLabel"
                defaultMessage="API key:"
              />
            </span>
          </EuiFlexItem>
          <EuiFlexItem grow={0}>
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
                  display="base"
                  onClick={toggleApiKeyVisibility}
                  data-test-subj="searchHomepageShowAPIKeyButton"
                  aria-label={i18n.translate('xpack.searchHomepage.apiKeyForm.showApiKey', {
                    defaultMessage: 'Show API key',
                  })}
                />,
                <EuiButtonIcon
                  size="s"
                  display="base"
                  color="text"
                  iconType="gear"
                  href={manageKeysLink}
                  target="_blank"
                  aria-label={i18n.translate('xpack.searchHomepage.apiKeyForm.manageApiKeys', {
                    defaultMessage: 'Manage API keys',
                  })}
                  data-test-subj="manageApiKeysButton"
                />,
              ]}
            />
          </EuiFlexItem>
        </>
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
      {/* <EuiFlexItem grow={false}>
        <EuiButtonIcon
          size="s"
          display="base"
          color="text"
          iconType="gear"
          href={manageKeysLink}
          target="_blank"
          aria-label={i18n.translate('xpack.searchHomepage.apiKeyForm.manageApiKeys', {
            defaultMessage: 'Manage API keys',
          })}
          data-test-subj="manageApiKeysButton"
        />
      </EuiFlexItem> */}
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
