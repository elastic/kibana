/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiCodeBlock,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiCopy,
  EuiPopover,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { Interpolation, Theme } from '@emotion/react';
import type { CreateAPIKeyResult } from '@kbn/security-api-key-management';
import { i18n } from '@kbn/i18n';

import { API_ENDPOINT_CODE_TOOLBAR_BUTTON_PROPS } from './api_endpoint_code_toolbar_constants';
import { Version2ApiEndpointsCreateApiKeyButton } from './version_2_api_endpoints_create_api_key_button';

/** Shown in the code block instead of real credentials (copy still uses the real value). */
const MASKED_SECRET_DISPLAY = '********************************';

export interface ApiEndpointSecretCodeBlockWithToolbarProps {
  displayedSecret: string;
  secretIsMissing: boolean;
  ariaLabel: string;
  dataTestSubj: string;
  codeBlockShortCss: Interpolation<Theme>;
  secretCodeSubduedCss?: Interpolation<Theme>;
  /** When true, copy + create icons sit on the code block instead of a separate column. */
  showActions: boolean;
  isEnrollment: boolean;
  fleetUrl?: string;
  apiKeyManageHref: string;
  onApiKeyCreated: (result: CreateAPIKeyResult) => void;
  createApiKeyDataTestSubj: string;
  copySecretDataTestSubj: string;
  createEnrollmentTokenDataTestSubj: string;
  /** When false, the manage popover is hidden (e.g. Version 1 uses header actions only). */
  showManageMenu?: boolean;
}

export const ApiEndpointSecretCodeBlockWithToolbar: React.FC<
  ApiEndpointSecretCodeBlockWithToolbarProps
> = ({
  displayedSecret,
  secretIsMissing,
  ariaLabel,
  dataTestSubj,
  codeBlockShortCss,
  secretCodeSubduedCss,
  showActions,
  isEnrollment,
  fleetUrl,
  apiKeyManageHref,
  onApiKeyCreated,
  createApiKeyDataTestSubj,
  copySecretDataTestSubj,
  createEnrollmentTokenDataTestSubj,
  showManageMenu = true,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isSecretActionsOpen, setIsSecretActionsOpen] = useState(false);

  const copyTooltip = secretIsMissing
    ? i18n.translate(
        'xpack.observability_onboarding.apiEndpointSecretCodeBlockWithToolbar.copyDisabledTooltip',
        {
          defaultMessage: 'Create or add a secret before copying',
        }
      )
    : i18n.translate(
        'xpack.observability_onboarding.apiEndpointSecretCodeBlockWithToolbar.copyTooltip',
        {
          defaultMessage: 'Copy to clipboard',
        }
      );

  const createEnrollmentTooltip = i18n.translate(
    'xpack.observability_onboarding.apiEndpointSecretCodeBlockWithToolbar.createEnrollmentTooltip',
    {
      defaultMessage: 'Create enrollment token',
    }
  );

  const maskedSecretTitle = i18n.translate(
    'xpack.observability_onboarding.apiEndpointSecretCodeBlockWithToolbar.maskedSecretTitle',
    {
      defaultMessage:
        'Credential is hidden in the UI for security. Use copy to retrieve the value.',
    }
  );

  const manageCredentialHref = isEnrollment
    ? fleetUrl != null
      ? `${fleetUrl.replace(/\/$/, '')}/enrollment-tokens`
      : undefined
    : apiKeyManageHref;

  const manageApiKeysLabel = i18n.translate(
    'xpack.observability_onboarding.apiEndpointSecretCodeBlockWithToolbar.manageApiKeys',
    {
      defaultMessage: 'Manage API keys',
    }
  );
  const manageTokensLabel = i18n.translate(
    'xpack.observability_onboarding.apiEndpointSecretCodeBlockWithToolbar.manageTokens',
    {
      defaultMessage: 'Manage tokens',
    }
  );
  const manageCredentialLabel = isEnrollment ? manageTokensLabel : manageApiKeysLabel;

  const moreActionsAriaLabel = i18n.translate(
    'xpack.observability_onboarding.apiEndpointSecretCodeBlockWithToolbar.moreActionsAriaLabel',
    {
      defaultMessage: 'More actions',
    }
  );

  const secretActionsMenuItems = useMemo(() => {
    if (manageCredentialHref == null) {
      return [];
    }
    return [
      <EuiContextMenuItem
        key="manage"
        data-test-subj={`${dataTestSubj}ManageMenuItem`}
        icon="popout"
        href={manageCredentialHref}
        onClick={() => setIsSecretActionsOpen(false)}
      >
        {manageCredentialLabel}
      </EuiContextMenuItem>,
    ];
  }, [dataTestSubj, manageCredentialHref, manageCredentialLabel]);

  const toolbarPaddingCss = css`
    .euiCodeBlock__pre {
      padding-inline-end: calc(
        8px + ${euiTheme.size.l} +
          ${showManageMenu && manageCredentialHref != null
            ? `${euiTheme.size.xxs} + ${euiTheme.size.l}`
            : '0px'} + ${showActions ? `${euiTheme.size.xxs} + ${euiTheme.size.l}` : '0px'} +
          ${euiTheme.size.s}
      ) !important;
    }
  `;

  /** Secret snippet is value-only (no `//` line); one line vs endpoint’s two-line block. */
  const secretValueOnlyCss = css`
    min-block-size: 32px;
    .euiCodeBlock__pre {
      min-block-size: 32px;
    }
    .euiCodeBlock__code {
      -webkit-line-clamp: 1;
    }
  `;

  const mergedBlockCss = [
    codeBlockShortCss,
    secretValueOnlyCss,
    secretCodeSubduedCss,
    toolbarPaddingCss,
  ].filter(Boolean) as Interpolation<Theme>[];
  const visibleSecretLine = secretIsMissing ? displayedSecret : MASKED_SECRET_DISPLAY;

  const toolbarCss = css`
    position: absolute;
    inset-inline-end: 12px;
    inset-block-start: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.xxs};
    z-index: ${euiTheme.levels.header};
  `;

  return (
    <div
      css={css`
        position: relative;
        min-width: 0;
        min-inline-size: 0;
        inline-size: 100%;
      `}
    >
      <EuiCodeBlock
        language="text"
        fontSize="s"
        paddingSize="none"
        isCopyable={false}
        title={secretIsMissing ? displayedSecret : maskedSecretTitle}
        aria-label={ariaLabel}
        data-test-subj={dataTestSubj}
        css={mergedBlockCss}
      >
        {visibleSecretLine}
      </EuiCodeBlock>
      <div data-test-subj={`${dataTestSubj}Toolbar`} css={toolbarCss}>
        <EuiToolTip content={copyTooltip} disableScreenReaderOutput>
          {secretIsMissing ? (
            <EuiButtonIcon
              data-test-subj={copySecretDataTestSubj}
              {...API_ENDPOINT_CODE_TOOLBAR_BUTTON_PROPS}
              iconType="copyClipboard"
              isDisabled
              aria-label={copyTooltip}
            />
          ) : (
            <EuiCopy textToCopy={displayedSecret}>
              {(copyToClipboard) => (
                <EuiButtonIcon
                  data-test-subj={copySecretDataTestSubj}
                  {...API_ENDPOINT_CODE_TOOLBAR_BUTTON_PROPS}
                  iconType="copyClipboard"
                  onClick={copyToClipboard}
                  aria-label={copyTooltip}
                />
              )}
            </EuiCopy>
          )}
        </EuiToolTip>
        {showManageMenu && manageCredentialHref != null ? (
          <EuiPopover
            button={
              <EuiButtonIcon
                data-test-subj={`${dataTestSubj}ActionsMenu`}
                {...API_ENDPOINT_CODE_TOOLBAR_BUTTON_PROPS}
                iconType="boxesVertical"
                onClick={() => setIsSecretActionsOpen((open) => !open)}
                aria-label={moreActionsAriaLabel}
              />
            }
            isOpen={isSecretActionsOpen}
            closePopover={() => setIsSecretActionsOpen(false)}
            anchorPosition="downRight"
            panelPaddingSize="none"
          >
            <EuiContextMenuPanel size="s" items={secretActionsMenuItems} />
          </EuiPopover>
        ) : null}
        {showActions ? (
          isEnrollment && fleetUrl ? (
            <EuiToolTip content={createEnrollmentTooltip} disableScreenReaderOutput>
              <EuiButtonIcon
                data-test-subj={createEnrollmentTokenDataTestSubj}
                {...API_ENDPOINT_CODE_TOOLBAR_BUTTON_PROPS}
                iconType="plusInCircle"
                href={fleetUrl}
                aria-label={createEnrollmentTooltip}
              />
            </EuiToolTip>
          ) : (
            <Version2ApiEndpointsCreateApiKeyButton
              variant="icon"
              dataTestSubj={createApiKeyDataTestSubj}
              manageApiKeysHref={apiKeyManageHref}
              onCreated={onApiKeyCreated}
            />
          )
        ) : null}
      </div>
    </div>
  );
};
