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
import { i18n } from '@kbn/i18n';

import { API_ENDPOINT_CODE_TOOLBAR_BUTTON_PROPS } from './api_endpoint_code_toolbar_constants';

export interface ApiEndpointCodeBlockWithStyledCopyProps {
  /** Plain value shown and copied to the clipboard. */
  copyValue: string;
  ariaLabel: string;
  dataTestSubj: string;
  copyDataTestSubj: string;
  codeBlockShortCss: Interpolation<Theme>;
}

/**
 * Code block showing only `{copyValue}` (section title lives outside). Copy pastes `copyValue`.
 */
export const ApiEndpointCodeBlockWithStyledCopy: React.FC<
  ApiEndpointCodeBlockWithStyledCopyProps
> = ({
  copyValue,
  ariaLabel,
  dataTestSubj,
  copyDataTestSubj,
  codeBlockShortCss,
}) => {
  const { euiTheme } = useEuiTheme();
  const toolbarPaddingCss = css`
    .euiCodeBlock__pre {
      padding-inline-end: calc(8px + ${euiTheme.size.l} + ${euiTheme.size.s}) !important;
    }
  `;
  const toolbarCss = css`
    position: absolute;
    inset-inline-end: 12px;
    inset-block-start: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    z-index: ${euiTheme.levels.header};
  `;

  const copyTooltip = i18n.translate(
    'xpack.observability_onboarding.apiEndpointCodeBlockWithStyledCopy.copyTooltip',
    {
      defaultMessage: 'Copy to clipboard',
    }
  );

  const endpointValueOnlyCss = css`
    min-block-size: 32px;
    .euiCodeBlock__pre {
      min-block-size: 32px;
    }
    .euiCodeBlock__code {
      -webkit-line-clamp: 1;
    }
  `;

  const mergedBlockCss = [codeBlockShortCss, endpointValueOnlyCss, toolbarPaddingCss] as Interpolation<Theme>[];

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
        title={copyValue}
        aria-label={ariaLabel}
        data-test-subj={dataTestSubj}
        css={mergedBlockCss}
      >
        {copyValue}
      </EuiCodeBlock>
      <div data-test-subj={`${dataTestSubj}Toolbar`} css={toolbarCss}>
        <EuiToolTip content={copyTooltip} disableScreenReaderOutput>
          <EuiCopy textToCopy={copyValue}>
            {(copyToClipboard) => (
              <EuiButtonIcon
                data-test-subj={copyDataTestSubj}
                {...API_ENDPOINT_CODE_TOOLBAR_BUTTON_PROPS}
                iconType="copyClipboard"
                onClick={copyToClipboard}
                aria-label={copyTooltip}
              />
            )}
          </EuiCopy>
        </EuiToolTip>
      </div>
    </div>
  );
};
