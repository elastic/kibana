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
  /** Plain value copied to the clipboard (excludes the leading `//` comment line). */
  copyValue: string;
  /** Comment label, e.g. `Endpoint` or `Cloud ID` (shown as `// Label` on its own line). */
  lineCommentLabel: string;
  ariaLabel: string;
  dataTestSubj: string;
  copyDataTestSubj: string;
  codeBlockShortCss: Interpolation<Theme>;
}

/**
 * Code block showing `// {label}` on line 1 and `{value}` on line 2.
 * Uses non-string children so the comment token can be styled independently; copy still pastes only `copyValue`.
 */
export const ApiEndpointCodeBlockWithStyledCopy: React.FC<
  ApiEndpointCodeBlockWithStyledCopyProps
> = ({
  copyValue,
  lineCommentLabel,
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

  const mergedBlockCss = [codeBlockShortCss, toolbarPaddingCss] as Interpolation<Theme>[];

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
        <React.Fragment>
          <span className="token comment">{`// ${lineCommentLabel}`}</span>
          {'\n'}
          <span>{copyValue}</span>
        </React.Fragment>
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
