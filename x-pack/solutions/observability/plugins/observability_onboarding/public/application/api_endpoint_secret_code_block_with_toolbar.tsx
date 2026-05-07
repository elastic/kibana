/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiButtonIcon, EuiCodeBlock, EuiCopy, EuiToolTip, useEuiTheme } from '@elastic/eui';
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
  /** Label for the comment line, e.g. `API key` (shown as `// Label` on line 1). */
  lineCommentLabel: string;
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
}

export const ApiEndpointSecretCodeBlockWithToolbar: React.FC<
  ApiEndpointSecretCodeBlockWithToolbarProps
> = ({
  displayedSecret,
  secretIsMissing,
  lineCommentLabel,
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
}) => {
  const { euiTheme } = useEuiTheme();

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

  const toolbarPaddingCss = css`
    .euiCodeBlock__pre {
      padding-inline-end: calc(
        ${showActions
            ? `${euiTheme.size.l} + ${euiTheme.size.l} + ${euiTheme.size.xxs}`
            : `${euiTheme.size.l}`} + ${euiTheme.size.s}
      ) !important;
    }
  `;

  const mergedBlockCss = [codeBlockShortCss, secretCodeSubduedCss, toolbarPaddingCss].filter(
    Boolean
  ) as Interpolation<Theme>[];
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
        <React.Fragment>
          <span className="token comment">{`// ${lineCommentLabel}`}</span>
          {'\n'}
          <span>{visibleSecretLine}</span>
        </React.Fragment>
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
        {showActions ? (
          isEnrollment && fleetUrl ? (
            <EuiToolTip content={createEnrollmentTooltip} disableScreenReaderOutput>
              <EuiButtonIcon
                data-test-subj={createEnrollmentTokenDataTestSubj}
                {...API_ENDPOINT_CODE_TOOLBAR_BUTTON_PROPS}
                iconType="popout"
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
