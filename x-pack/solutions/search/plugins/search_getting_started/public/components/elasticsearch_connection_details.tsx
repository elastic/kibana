/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiButtonIcon,
  EuiCode,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiPanel,
  EuiPopover,
  EuiSplitButton,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  type UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { openWiredConnectionDetails } from '@kbn/cloud/connection_details';
import { Status, useSearchApiKey } from '@kbn/search-api-keys-components';
import { useElasticsearchUrl } from '../hooks/use_elasticsearch_url';
import { useKibana } from '../hooks/use_kibana';

const TELEMETRY_PREFIX = 'searchGettingStarted-connectionDetails';
const COPIED_ICON_DISPLAY_DURATION_MS = 1000;

const getConnectionDetailsErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object') {
    const httpError = error as { body?: { message?: string }; message?: string };
    if (httpError.body?.message) {
      return httpError.body.message;
    }
    if (typeof httpError.message === 'string') {
      return httpError.message;
    }
  }

  return i18n.translate(
    'xpack.searchGettingStarted.elasticsearchConnectionDetails.unexpectedErrorMessage',
    { defaultMessage: 'An unexpected error occurred' }
  );
};

const urlStyle = ({ euiTheme }: UseEuiTheme) => css`
  color: ${euiTheme.colors.textParagraph};
  font-weight: ${euiTheme.font.weight.regular};
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 400px;
`;

const flexItemStyle = css`
  min-width: 0;
`;

const EndpointUrl = ({ elasticsearchUrl }: { elasticsearchUrl: string }) => {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback((copyFn: () => void) => {
    copyFn();
    setIsCopied(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsCopied(false);
    }, COPIED_ICON_DISPLAY_DURATION_MS);
  }, []);

  return (
    <EuiPanel paddingSize="xs" hasBorder>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem css={flexItemStyle}>
          <EuiCode transparentBackground css={urlStyle} data-test-subj="endpointValueField">
            {elasticsearchUrl}
          </EuiCode>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiCopy textToCopy={elasticsearchUrl}>
            {(copy) => (
              <EuiToolTip
                content={
                  isCopied
                    ? i18n.translate(
                      'xpack.searchGettingStarted.elasticsearchConnectionDetails.copiedTooltip',
                      { defaultMessage: 'Copied' }
                    )
                    : i18n.translate(
                      'xpack.searchGettingStarted.elasticsearchConnectionDetails.copyTooltip',
                      { defaultMessage: 'Copy' }
                    )
                }
                disableScreenReaderOutput
              >
                <EuiButtonIcon
                  iconType={isCopied ? 'check' : 'copy'}
                  color={isCopied ? 'success' : 'text'}
                  onClick={() => handleCopy(copy)}
                  size="xs"
                  aria-label={
                    isCopied
                      ? i18n.translate(
                        'xpack.searchGettingStarted.elasticsearchConnectionDetails.copiedAriaLabel',
                        { defaultMessage: 'Copied' }
                      )
                      : i18n.translate(
                        'xpack.searchGettingStarted.elasticsearchConnectionDetails.copyUrlAriaLabel',
                        { defaultMessage: 'Copy Elasticsearch URL' }
                      )
                  }
                  data-test-subj={isCopied ? 'copyEndpointButton-copied' : 'copyEndpointButton'}
                  data-telemetry-id={`${TELEMETRY_PREFIX}-copyEndpointUrl`}
                />
              </EuiToolTip>
            )}
          </EuiCopy>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

interface ApiKeySplitButtonProps {
  isLoading: boolean;
  label: string;
  onPrimaryClick: () => void;
  onSecondaryClick: () => void;
  primaryTestSubj: string;
  primaryTelemetryId: string;
}

const ApiKeySplitButton = ({
  isLoading,
  label,
  onPrimaryClick,
  onSecondaryClick,
  primaryTestSubj,
  primaryTelemetryId,
}: ApiKeySplitButtonProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiSplitButton fill color="primary" isLoading={isLoading} size="s">
      <EuiSplitButton.ActionPrimary
        onClick={onPrimaryClick}
        data-test-subj={primaryTestSubj}
        data-telemetry-id={`${TELEMETRY_PREFIX}-${primaryTelemetryId}`}
      >
        <EuiIcon type="key" css={{ marginRight: euiTheme.size.s }} aria-hidden />
        {label}
      </EuiSplitButton.ActionPrimary>
      <EuiSplitButton.ActionSecondary
        iconType="chevronSingleDown"
        aria-label={i18n.translate(
          'xpack.searchGettingStarted.elasticsearchConnectionDetails.moreOptionsAriaLabel',
          { defaultMessage: 'More options' }
        )}
        onClick={onSecondaryClick}
        data-test-subj="searchGettingStartedApiKeyDropdown"
        data-telemetry-id={`${TELEMETRY_PREFIX}-apiKeys-openPopover`}
      />
    </EuiSplitButton>
  );
};

const ConnectionApiKeys = ({
  apiKey,
  isLoading,
}: {
  apiKey: string | null;
  isLoading: boolean;
}) => {
  const {
    services: { notifications, application },
  } = useKibana();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopover = () => setIsPopoverOpen((open) => !open);

  const handleOpenConnectionDetails = (tabId: 'apiKeys' | 'endpoints') => {
    setIsPopoverOpen(false);
    openWiredConnectionDetails({
      props: { options: { defaultTabId: tabId } },
    }).catch((error: unknown) => {
      notifications.toasts.addDanger(getConnectionDetailsErrorMessage(error));
    });
  };

  const dropdownItems = [
    <EuiContextMenuItem
      key="generateApiKey"
      icon="key"
      onClick={() => handleOpenConnectionDetails('apiKeys')}
      data-test-subj="generateApiKeyLink"
      data-telemetry-id={`${TELEMETRY_PREFIX}-generateApiKey-popoverItem`}
    >
      {i18n.translate(
        'xpack.searchGettingStarted.elasticsearchConnectionDetails.generateApiKeyDropDownOptionLabel',
        { defaultMessage: 'Generate API key' }
      )}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="manageApiKeys"
      icon="gear"
      onClick={() => {
        setIsPopoverOpen(false);
        application.navigateToApp('management', { path: 'security/api_keys' });
      }}
      data-test-subj="searchGettingStartedManageApiKeys"
      data-telemetry-id={`${TELEMETRY_PREFIX}-manageApiKeys-popoverItem`}
    >
      {i18n.translate(
        'xpack.searchGettingStarted.elasticsearchConnectionDetails.manageApiKeysDropDownOptionLabel',
        { defaultMessage: 'Manage API keys' }
      )}
    </EuiContextMenuItem>,

    <EuiContextMenuItem
      key="connectionDetails"
      icon="plugs"
      onClick={() => handleOpenConnectionDetails('endpoints')}
      data-test-subj="viewConnectionDetailsLink"
      data-telemetry-id={`${TELEMETRY_PREFIX}-connectionDetails-popoverItem`}
    >
      {i18n.translate(
        'xpack.searchGettingStarted.elasticsearchConnectionDetails.connectionDetailsDropDownOptionLabel',
        { defaultMessage: 'Connection details' }
      )}
    </EuiContextMenuItem>,
  ];

  const splitButton = apiKey ? (
    <EuiCopy textToCopy={apiKey}>
      {(copy) => (
        <ApiKeySplitButton
          isLoading={isLoading}
          label={i18n.translate(
            'xpack.searchGettingStarted.elasticsearchConnectionDetails.copyApiKeyButtonLabel',
            { defaultMessage: 'Copy your API key' }
          )}
          onPrimaryClick={copy}
          onSecondaryClick={togglePopover}
          primaryTestSubj="searchGettingStartedCopyApiKey"
          primaryTelemetryId="copyApiKey"
        />
      )}
    </EuiCopy>
  ) : (
    <ApiKeySplitButton
      isLoading={isLoading}
      label={i18n.translate(
        'xpack.searchGettingStarted.elasticsearchConnectionDetails.generateApiKeyButtonLabel',
        { defaultMessage: 'Generate API key' }
      )}
      onPrimaryClick={() => handleOpenConnectionDetails('apiKeys')}
      onSecondaryClick={togglePopover}
      primaryTestSubj="searchGettingStartedGenerateApiKey"
      primaryTelemetryId="generateApiKey"
    />
  );

  return (
    <EuiPopover
      button={splitButton}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
      aria-label={i18n.translate(
        'xpack.searchGettingStarted.elasticsearchConnectionDetails.apiKeyOptionsMenuAriaLabel',
        { defaultMessage: 'API key options menu' }
      )}
    >
      <EuiContextMenuPanel items={dropdownItems} />
    </EuiPopover>
  );
};

export const ElasticsearchConnectionDetails = () => {
  const elasticsearchUrl = useElasticsearchUrl();
  const { apiKey, status } = useSearchApiKey();
  const isLoading = status === Status.uninitialized || status === Status.loading;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxxs">
              <h3>
                {i18n.translate(
                  'xpack.searchGettingStarted.elasticsearchConnectionDetails.endpointLabel',
                  {
                    defaultMessage: 'Elasticsearch endpoint:',
                  }
                )}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIconTip
              content={i18n.translate(
                'xpack.searchGettingStarted.elasticsearchConnectionDetails.endpointTooltip',
                {
                  defaultMessage:
                    'The Elasticsearch endpoint is the URL for your Elasticsearch cluster.',
                }
              )}
              position="right"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EndpointUrl elasticsearchUrl={elasticsearchUrl} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ConnectionApiKeys apiKey={apiKey} isLoading={isLoading} />
          </EuiFlexItem>
          {/* <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="plugs"
              color="text"
              size="s"
              data-test-subj="viewConnectionDetailsLink"
              onClick={() => openWiredConnectionDetails({
                props: { options: { defaultTabId: 'endpoints' } },
              })}
            >
              {i18n.translate(
                'xpack.searchGettingStarted.elasticsearchConnectionDetails.viewConnectionDetailsButtonLabel',
                { defaultMessage: 'Connection details' }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem> */}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
