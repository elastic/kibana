/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCopy,
  EuiFieldPassword,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormAppend,
  EuiFormRow,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  encodedApiKey?: string;
  isCreating: boolean;
  canCreate: boolean;
  wasKeyCreatedBefore: boolean;
  onCreate: () => void;
  dataTestSubjSuffix?: string;
  ariaLabel?: string;
  isDisabled?: boolean;
  createdBeforePlaceholder?: string;
}

export const ApiKeyField = ({
  encodedApiKey,
  isCreating,
  canCreate,
  wasKeyCreatedBefore,
  onCreate,
  dataTestSubjSuffix = '',
  ariaLabel,
  isDisabled = false,
  createdBeforePlaceholder,
}: Props) => {
  const hasApiKey = Boolean(encodedApiKey);

  const apiKeyLabel = i18n.translate('xpack.observability_onboarding.apiEndpoints.apiKeyLabel', {
    defaultMessage: 'API key',
  });
  const noPermissionMessage = i18n.translate(
    'xpack.observability_onboarding.apiEndpoints.noPermissionMessage',
    {
      defaultMessage: "You don't have permission to create API keys. Contact your administrator.",
    }
  );
  const apiKeyCreationInProgressMessage = i18n.translate(
    'xpack.observability_onboarding.apiEndpoints.apiKeyCreationInProgressMessage',
    {
      defaultMessage: 'Another API key is being created. Wait for it to finish.',
    }
  );
  const createButtonTooltip = !canCreate
    ? noPermissionMessage
    : isDisabled
    ? apiKeyCreationInProgressMessage
    : undefined;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
      <EuiFlexItem>
        <EuiFormRow
          fullWidth
          label={apiKeyLabel}
          helpText={!canCreate ? noPermissionMessage : undefined}
        >
          <EuiFieldPassword
            fullWidth
            type={hasApiKey ? 'dual' : 'password'}
            value={encodedApiKey ?? ''}
            placeholder={
              wasKeyCreatedBefore
                ? createdBeforePlaceholder ??
                  i18n.translate(
                    'xpack.observability_onboarding.apiEndpoints.apiKeyCreatedBeforePlaceholder',
                    { defaultMessage: 'Existing key cannot be displayed. Create a new one' }
                  )
                : i18n.translate('xpack.observability_onboarding.apiEndpoints.apiKeyPlaceholder', {
                    defaultMessage: 'No API key yet',
                  })
            }
            data-test-subj={`observabilityOnboardingApiEndpointApiKeyValue${dataTestSubjSuffix}`}
            aria-label={ariaLabel ?? apiKeyLabel}
            append={
              hasApiKey ? (
                <EuiCopy textToCopy={encodedApiKey ?? ''}>
                  {(copy) => (
                    <EuiFormAppend
                      element="button"
                      iconLeft="copy"
                      onClick={copy}
                      data-test-subj={`observabilityOnboardingApiEndpointApiKeyCopyButton${dataTestSubjSuffix}`}
                      aria-label={i18n.translate(
                        'xpack.observability_onboarding.apiEndpoints.apiKeyCopyButtonAriaLabel',
                        {
                          defaultMessage: 'Copy {label} to clipboard',
                          values: { label: ariaLabel ?? apiKeyLabel },
                        }
                      )}
                    />
                  )}
                </EuiCopy>
              ) : undefined
            }
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFormRow hasEmptyLabelSpace>
          <EuiToolTip content={createButtonTooltip}>
            <EuiButton
              iconType="plusCircle"
              onClick={onCreate}
              isLoading={isCreating}
              isDisabled={!canCreate || isDisabled}
              data-test-subj={`observabilityOnboardingApiEndpointCreateApiKeyButton${dataTestSubjSuffix}`}
            >
              {i18n.translate('xpack.observability_onboarding.apiEndpoints.createKey', {
                defaultMessage: 'Create key',
              })}
            </EuiButton>
          </EuiToolTip>
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
