/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiContextMenuItem, EuiContextMenuPanel, EuiSplitButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CreateAPIKeyResult } from '@kbn/security-api-key-management';
import { ApiKeyFlyout } from '@kbn/security-api-key-management';

import type { ObservabilityOnboardingAppServices } from '..';
import { API_ENDPOINTS } from './pages/ingest_hub/ingest_hub_data';

export function resolveVersion1HeaderCreateApiKeyTargetEndpointId(selectedId: string): string {
  const selected = API_ENDPOINTS.find((e) => e.id === selectedId);
  if (selected && (selected.keyType === 'api_key' || selected.keyType === 'kibana_note')) {
    return selectedId;
  }
  const firstApiKey = API_ENDPOINTS.find(
    (e) => e.keyType === 'api_key' || e.keyType === 'kibana_note'
  );
  return firstApiKey?.id ?? 'endpoint-otlp';
}

export function getFleetEnrollmentBaseHref(origin: string): string {
  const fleet = API_ENDPOINTS.find((e) => e.keyType === 'enrollment_token' && e.openUrl);
  return fleet?.openUrl?.(origin) ?? `${origin}/app/fleet`;
}

export interface Version1ApiEndpointsHeaderCredentialSplitProps {
  dataTestSubj: string;
  apiKeyManageHref: string;
  enrollmentFleetHref: string;
  createApiKeyForEndpointId: string;
  onApiKeyCreated: (result: CreateAPIKeyResult, endpointId: string) => void;
}

export const Version1ApiEndpointsHeaderCredentialSplit: React.FC<
  Version1ApiEndpointsHeaderCredentialSplitProps
> = ({
  dataTestSubj,
  apiKeyManageHref,
  enrollmentFleetHref,
  createApiKeyForEndpointId,
  onApiKeyCreated,
}) => {
  const {
    services: { notifications },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  const createNewKeyLabel = i18n.translate(
    'xpack.observabilityOnboarding.version1ApiEndpointsHeader.createNewKey',
    {
      defaultMessage: 'Create new key',
    }
  );

  const createEnrollmentTokenLabel = i18n.translate(
    'xpack.observabilityOnboarding.version1ApiEndpointsHeader.createNewEnrollmentToken',
    {
      defaultMessage: 'Create new enrollment token',
    }
  );

  const manageKeysLabel = i18n.translate(
    'xpack.observabilityOnboarding.version1ApiEndpointsHeader.manageKeys',
    {
      defaultMessage: 'Manage keys',
    }
  );

  const actionsMenuAriaLabel = i18n.translate(
    'xpack.observabilityOnboarding.version1ApiEndpointsHeader.actionsMenuAriaLabel',
    {
      defaultMessage: 'More credential actions',
    }
  );

  return (
    <>
      <EuiSplitButton data-test-subj={`${dataTestSubj}Split`} size="s" color="primary" fill={false}>
        <EuiSplitButton.ActionPrimary
          data-test-subj={`${dataTestSubj}Primary`}
          type="button"
          onClick={() => setIsFlyoutOpen(true)}
        >
          {createNewKeyLabel}
        </EuiSplitButton.ActionPrimary>
        <EuiSplitButton.ActionSecondary
          data-test-subj={`${dataTestSubj}ActionsMenu`}
          aria-label={actionsMenuAriaLabel}
          onClick={() => setIsActionsMenuOpen((open) => !open)}
          popoverProps={{
            isOpen: isActionsMenuOpen,
            closePopover: () => setIsActionsMenuOpen(false),
            panelPaddingSize: 'none',
            repositionOnScroll: true,
            children: (
              <EuiContextMenuPanel
                size="s"
                items={[
                  <EuiContextMenuItem
                    key="enrollment"
                    data-test-subj={`${dataTestSubj}CreateEnrollmentToken`}
                    href={enrollmentFleetHref}
                    onClick={() => setIsActionsMenuOpen(false)}
                  >
                    {createEnrollmentTokenLabel}
                  </EuiContextMenuItem>,
                  <EuiContextMenuItem
                    key="manage"
                    data-test-subj={`${dataTestSubj}ManageKeys`}
                    href={apiKeyManageHref}
                    onClick={() => setIsActionsMenuOpen(false)}
                  >
                    {manageKeysLabel}
                  </EuiContextMenuItem>,
                ]}
              />
            ),
          }}
        />
      </EuiSplitButton>
      {isFlyoutOpen ? (
        <ApiKeyFlyout
          widenFlyout
          onCancel={() => setIsFlyoutOpen(false)}
          onSuccess={(createApiKeyResponse) => {
            onApiKeyCreated(createApiKeyResponse, createApiKeyForEndpointId);
            notifications.toasts.addSuccess({
              title: i18n.translate(
                'xpack.observabilityOnboarding.version1ApiEndpointsHeader.apiKeyCreated',
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
