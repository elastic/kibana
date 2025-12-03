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
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiCopy,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { ApiKeyFlyoutWrapper } from './api_key_flyout_wrapper';
import { useWorkplaceAIApiKey } from '../hooks/use_workplaceai_api_key';
import { Status } from '../constants';

const API_KEY_MASK = '•'.repeat(60);

interface ApiKeyFormProps {
  hasTitle?: boolean;
}

export const ApiKeyForm: React.FC<ApiKeyFormProps> = ({ hasTitle = true }) => {
  const [showFlyout, setShowFlyout] = useState(false);
  const { apiKey, status, updateApiKey, toggleApiKeyVisibility } = useWorkplaceAIApiKey();

  if (apiKey) {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton fill={false} color="text" size="s">
            {status === Status.showPreviewKey ? apiKey : API_KEY_MASK}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiCopy textToCopy={apiKey}>
            {(copy) => (
              <EuiButtonIcon
                iconType="copy"
                size="s"
                color="text"
                onClick={copy}
                data-test-subj="copyAPIKeyButton"
                aria-label={i18n.translate(
                  'xpack.workplaceai.apiKeyComponents.copyApiKeyAriaLabel',
                  {
                    defaultMessage: 'Copy API Key',
                  }
                )}
              />
            )}
          </EuiCopy>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType={status === Status.showPreviewKey ? 'eyeClosed' : 'eye'}
            size="s"
            color="text"
            onClick={toggleApiKeyVisibility}
            data-test-subj="showAPIKeyButton"
            aria-label={i18n.translate('xpack.workplaceai.apiKeyComponents.showApiKeyAriaLabel', {
              defaultMessage: 'Show API Key',
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" justifyContent="flexStart" responsive={false}>
      {hasTitle && (
        <EuiFlexItem grow={0}>
          <EuiTitle size="xxxs" css={{ whiteSpace: 'nowrap' }}>
            <h6>
              <FormattedMessage
                id="xpack.workplaceai.apiKeyComponents.apiKeyTitle"
                defaultMessage="API Key"
              />
            </h6>
          </EuiTitle>
        </EuiFlexItem>
      )}
      {status === Status.showUserPrivilegesError && (
        <EuiFlexItem grow={0}>
          <EuiBadge data-test-subj="apiKeyFormNoUserPrivileges">
            <FormattedMessage
              id="xpack.workplaceai.apiKeyComponents.noUserPrivilegesBadge"
              defaultMessage="You don't have access to manage API keys"
            />
          </EuiBadge>
        </EuiFlexItem>
      )}
      {status === Status.loading && (
        <EuiFlexItem grow={0}>
          <EuiButton
            fill={false}
            color="text"
            size="s"
            iconSide="left"
            iconType="key"
            isLoading={true}
            data-test-subj="apiKeyLoadingButton"
          >
            <FormattedMessage
              id="xpack.workplaceai.apiKeyComponents.apiKeyButtonLabel"
              defaultMessage="API Key"
            />
          </EuiButton>
        </EuiFlexItem>
      )}
      {(status === Status.showCreateButton || status === Status.uninitialized) && (
        <EuiFlexItem grow={0}>
          <EuiButton
            fill={false}
            color="text"
            size="s"
            iconSide="left"
            iconType="key"
            onClick={() => setShowFlyout(true)}
            data-test-subj="createAPIKeyButton"
          >
            {hasTitle ? (
              <FormattedMessage
                id="xpack.workplaceai.apiKeyComponents.createApiKeyButtonLabel"
                defaultMessage="Create an API Key"
              />
            ) : (
              <FormattedMessage
                id="xpack.workplaceai.apiKeyComponents.apiKeyButtonLabel"
                defaultMessage="API Key"
              />
            )}
          </EuiButton>
          {showFlyout && (
            <ApiKeyFlyoutWrapper onCancel={() => setShowFlyout(false)} onSuccess={updateApiKey} />
          )}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
