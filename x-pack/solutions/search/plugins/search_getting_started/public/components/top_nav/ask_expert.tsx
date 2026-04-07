/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexItem, EuiTitle, EuiLink, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';

export const AskExpert: React.FC<{ askExpertLink: string }> = ({ askExpertLink }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxxs">
          <p>
            {i18n.translate('xpack.search.gettingStarted.topNav.needHelpTitleLabel', {
              defaultMessage: 'Need help?',
            })}
          </p>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem
        grow={false}
        css={css`
          border-right: ${euiTheme.border.thick};
          padding: ${euiTheme.size.s};
        `}
        aria-label={i18n.translate(
          'xpack.search.gettingStarted.topNav.ariaLabel.askAnExpertLinkLabel',
          {
            defaultMessage: 'Need help? Ask an expert',
          }
        )}
      >
        <EuiLink target="_blank" href={askExpertLink} data-test-subj="gettingStartedAskExpert">
          {i18n.translate('xpack.search.gettingStarted.topNav.askAnExpertLinkLabel', {
            defaultMessage: 'Ask an expert',
          })}
        </EuiLink>
      </EuiFlexItem>
    </>
  );
};
