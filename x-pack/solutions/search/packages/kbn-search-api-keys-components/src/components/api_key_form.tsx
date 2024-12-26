/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { FormInfoField } from '@kbn/search-shared-ui';
import { ApiKeyFlyoutWrapper } from './api_key_flyout_wrapper';
import { useSearchApiKey } from '../hooks/use_search_api_key';
import { Status } from '../constants';

const API_KEY_MASK = '•'.repeat(60);

interface ApiKeyFormProps {
  hasTitle?: boolean;
}

export const ApiKeyForm: React.FC<ApiKeyFormProps> = ({ hasTitle = true }) => {
  const [showFlyout, setShowFlyout] = useState(false);
  const { apiKey, status, updateApiKey, toggleApiKeyVisibility } = useSearchApiKey();

  const titleLocale = i18n.translate('searchApiKeysComponents.apiKeyForm.title', {
    defaultMessage: 'API Key',
  });

  if (apiKey) {
    return (
      <FormInfoField
        label={hasTitle ? titleLocale : undefined}
        value={status === Status.showPreviewKey ? apiKey : API_KEY_MASK}
        copyValue={apiKey}
        dataTestSubj="apiKeyFormAPIKey"
        copyValueDataTestSubj="APIKeyButtonCopy"
        actions={[
          <EuiButtonIcon
            iconType={status === Status.showPreviewKey ? 'eyeClosed' : 'eye'}
            color="text"
            onClick={toggleApiKeyVisibility}
            data-test-subj="showAPIKeyButton"
            aria-label={i18n.translate('searchApiKeysComponents.apiKeyForm.showApiKey', {
              defaultMessage: 'Show API Key',
            })}
          />,
        ]}
      />
    );
  }

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" justifyContent="flexStart" responsive={false}>
      {hasTitle && (
        <EuiFlexItem grow={0}>
          <EuiTitle size="xxxs" css={{ whiteSpace: 'nowrap' }}>
            <h6>{titleLocale}</h6>
          </EuiTitle>
        </EuiFlexItem>
      )}
      {status === Status.showUserPrivilegesError && (
        <EuiFlexItem grow={0}>
          <EuiBadge data-test-subj="apiKeyFormNoUserPrivileges">
            {i18n.translate('searchApiKeysComponents.apiKeyForm.noUserPrivileges', {
              defaultMessage: "You don't have access to manage API keys",
            })}
          </EuiBadge>
        </EuiFlexItem>
      )}
      {status === Status.showCreateButton && (
        <EuiFlexItem grow={0}>
          <EuiButton
            color="primary"
            size="s"
            iconSide="left"
            iconType="key"
            onClick={() => setShowFlyout(true)}
            data-test-subj="createAPIKeyButton"
          >
            <FormattedMessage
              id="searchApiKeysComponents.apiKeyForm.createButton"
              defaultMessage="Create an API Key"
            />
          </EuiButton>
          {showFlyout && (
            <ApiKeyFlyoutWrapper onCancel={() => setShowFlyout(false)} onSuccess={updateApiKey} />
          )}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
