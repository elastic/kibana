/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiSplitButton,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CreateAPIKeyResult } from '@kbn/security-api-key-management';
import { ApiKeyFlyout } from '@kbn/security-api-key-management';

import type { ObservabilityOnboardingAppServices } from '..';
import { API_ENDPOINT_CODE_TOOLBAR_BUTTON_PROPS } from './api_endpoint_code_toolbar_constants';

export interface Version2ApiEndpointsCreateApiKeyButtonProps {
  dataTestSubj: string;
  manageApiKeysHref: string;
  onCreated: (result: CreateAPIKeyResult) => void;
  /** `icon` renders a single control; `small` renders a text empty button; both open the create flyout. */
  variant?: 'split' | 'icon' | 'small';
  /** Overrides default “New key” label when `variant="small"`. */
  smallButtonLabel?: string;
}

export const Version2ApiEndpointsCreateApiKeyButton: React.FC<
  Version2ApiEndpointsCreateApiKeyButtonProps
> = ({ dataTestSubj, manageApiKeysHref, onCreated, variant = 'split', smallButtonLabel }) => {
  const {
    services: { notifications },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [isManageMenuOpen, setIsManageMenuOpen] = useState(false);

  const createApiKeyLabel = i18n.translate(
    'xpack.observabilityOnboarding.version2ApiEndpoints.createApiKeyButton',
    {
      defaultMessage: 'Create API key',
    }
  );

  return (
    <>
      {variant === 'icon' ? (
        <EuiToolTip content={createApiKeyLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            data-test-subj={dataTestSubj}
            {...API_ENDPOINT_CODE_TOOLBAR_BUTTON_PROPS}
            iconType="plusInCircle"
            onClick={() => setIsFlyoutOpen(true)}
            aria-label={createApiKeyLabel}
          />
        </EuiToolTip>
      ) : variant === 'small' ? (
        <EuiButton
          data-test-subj={dataTestSubj}
          size="xs"
          display="base"
          fill={false}
          iconType="plusInCircle"
          iconSide="left"
          onClick={() => setIsFlyoutOpen(true)}
        >
          {smallButtonLabel ??
            i18n.translate('xpack.observabilityOnboarding.version2ApiEndpoints.newKeyButton', {
              defaultMessage: 'New key',
            })}
        </EuiButton>
      ) : (
        <EuiSplitButton
          data-test-subj={`${dataTestSubj}Split`}
          size="s"
          color="primary"
          fill={false}
        >
          <EuiSplitButton.ActionPrimary
            data-test-subj={dataTestSubj}
            type="button"
            onClick={() => setIsFlyoutOpen(true)}
          >
            {createApiKeyLabel}
          </EuiSplitButton.ActionPrimary>
          <EuiSplitButton.ActionSecondary
            data-test-subj={`${dataTestSubj}ActionsMenu`}
            aria-label={i18n.translate(
              'xpack.observabilityOnboarding.version2ApiEndpoints.apiKeyActionsAriaLabel',
              {
                defaultMessage: 'More API key actions',
              }
            )}
            onClick={() => setIsManageMenuOpen((open) => !open)}
            popoverProps={{
              isOpen: isManageMenuOpen,
              closePopover: () => setIsManageMenuOpen(false),
              panelPaddingSize: 'none',
              repositionOnScroll: true,
              children: (
                <EuiContextMenuPanel
                  size="s"
                  items={[
                    <EuiContextMenuItem
                      key="manage"
                      data-test-subj={`${dataTestSubj}ManageKeys`}
                      href={manageApiKeysHref}
                      onClick={() => setIsManageMenuOpen(false)}
                    >
                      {i18n.translate(
                        'xpack.observabilityOnboarding.version2ApiEndpoints.manageApiKeys',
                        {
                          defaultMessage: 'Manage API keys',
                        }
                      )}
                    </EuiContextMenuItem>,
                  ]}
                />
              ),
            }}
          />
        </EuiSplitButton>
      )}
      {isFlyoutOpen ? (
        <ApiKeyFlyout
          widenFlyout
          onCancel={() => setIsFlyoutOpen(false)}
          onSuccess={(createApiKeyResponse) => {
            onCreated(createApiKeyResponse);
            notifications.toasts.addSuccess({
              title: i18n.translate(
                'xpack.observabilityOnboarding.version2ApiEndpoints.apiKeyCreated',
                {
                  defaultMessage: "Created API key ''{name}''",
                  values: { name: createApiKeyResponse.name },
                }
              ),
              'data-test-subj': `${dataTestSubj}CreatedToast`,
            });
            setIsFlyoutOpen(false);
          }}
        />
      ) : null}
    </>
  );
};
