/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiCopy,
  EuiIcon,
  EuiPopover,
  EuiSplitButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { openWiredConnectionDetails } from '@kbn/cloud/connection_details';
import { useKibana } from '../services';

interface OnboardingApiKeysProps {
  apiKey: string | null | undefined;
  isLoading: boolean;
  fill?: boolean;
  telemetryPage: string;
}

interface ApiKeySplitButtonProps {
  fill: boolean;
  isLoading: boolean;
  label: string;
  onPrimaryClick: () => void;
  onSecondaryClick: () => void;
  primaryTestSubj: string;
  primaryTelemetryId: string;
  telemetryPrefix: string;
}

const ApiKeySplitButton = ({
  fill,
  isLoading,
  label,
  onPrimaryClick,
  onSecondaryClick,
  primaryTestSubj,
  primaryTelemetryId,
  telemetryPrefix,
}: ApiKeySplitButtonProps) => (
  <EuiSplitButton fill={fill} color={fill ? 'primary' : 'text'} isLoading={isLoading}>
    <EuiSplitButton.ActionPrimary
      onClick={onPrimaryClick}
      data-test-subj={primaryTestSubj}
      data-telemetry-id={`${telemetryPrefix}-${primaryTelemetryId}`}
    >
      <EuiIcon type="key" css={{ marginRight: 8 }} aria-hidden />
      {label}
    </EuiSplitButton.ActionPrimary>
    <EuiSplitButton.ActionSecondary
      iconType="arrowDown"
      aria-label={i18n.translate('vectordbOnboarding.pathSelection.moreOptions', {
        defaultMessage: 'More options',
      })}
      onClick={onSecondaryClick}
      data-test-subj="vectordbPathSelectionApiKeyDropdown"
      data-telemetry-id={`${telemetryPrefix}-apiKeys-openPopover`}
    />
  </EuiSplitButton>
);

export const OnboardingApiKeys = ({
  apiKey,
  isLoading,
  fill = true,
  telemetryPage,
}: OnboardingApiKeysProps) => {
  const {
    services: { notifications, application },
  } = useKibana();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const telemetryPrefix = `vectordbOnboarding-${telemetryPage}`;

  const togglePopover = () => setIsPopoverOpen((open) => !open);

  const handleOpenConnectionDetails = (tabId: 'apiKeys' | 'endpoints') => {
    setIsPopoverOpen(false);
    openWiredConnectionDetails({
      props: { options: { defaultTabId: tabId } },
    }).catch((error) => {
      notifications.toasts.addDanger(
        error?.body?.message ??
          error?.message ??
          i18n.translate('vectordbOnboarding.pathSelection.unexpectedError', {
            defaultMessage: 'An unexpected error occurred',
          })
      );
    });
  };

  const dropdownItems = [
    <EuiContextMenuItem
      key="manageApiKeys"
      icon="key"
      onClick={() => {
        setIsPopoverOpen(false);
        application.navigateToApp('management', { path: 'security/api_keys' });
      }}
      data-test-subj="vectordbPathSelectionManageApiKeys"
      data-telemetry-id={`${telemetryPrefix}-manageApiKeys-popoverItem`}
    >
      {i18n.translate('vectordbOnboarding.pathSelection.manageApiKeys', {
        defaultMessage: 'Manage API keys',
      })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="connectionDetails"
      icon="plugs"
      onClick={() => handleOpenConnectionDetails('endpoints')}
      data-test-subj="vectordbPathSelectionConnectionDetails"
      data-telemetry-id={`${telemetryPrefix}-connectionDetails-popoverItem`}
    >
      {i18n.translate('vectordbOnboarding.pathSelection.connectionDetails', {
        defaultMessage: 'Connection details',
      })}
    </EuiContextMenuItem>,
  ];

  const splitButton = apiKey ? (
    <EuiCopy textToCopy={apiKey}>
      {(copy) => (
        <ApiKeySplitButton
          fill={fill}
          isLoading={isLoading}
          label={i18n.translate('vectordbOnboarding.pathSelection.copyApiKey', {
            defaultMessage: 'Copy your API key',
          })}
          onPrimaryClick={copy}
          onSecondaryClick={togglePopover}
          primaryTestSubj="vectordbPathSelectionCopyApiKey"
          primaryTelemetryId="copyApiKey"
          telemetryPrefix={telemetryPrefix}
        />
      )}
    </EuiCopy>
  ) : (
    <ApiKeySplitButton
      fill={fill}
      isLoading={isLoading}
      label={i18n.translate('vectordbOnboarding.pathSelection.generateApiKey', {
        defaultMessage: 'Generate API key',
      })}
      onPrimaryClick={() => handleOpenConnectionDetails('apiKeys')}
      onSecondaryClick={togglePopover}
      primaryTestSubj="vectordbPathSelectionGenerateApiKey"
      primaryTelemetryId="generateApiKey"
      telemetryPrefix={telemetryPrefix}
    />
  );

  return (
    <EuiPopover
      button={splitButton}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
      aria-label={i18n.translate('vectordbOnboarding.pathSelection.apiKeyOptionsMenu', {
        defaultMessage: 'API key options menu',
      })}
    >
      <EuiContextMenuPanel items={dropdownItems} />
    </EuiPopover>
  );
};
