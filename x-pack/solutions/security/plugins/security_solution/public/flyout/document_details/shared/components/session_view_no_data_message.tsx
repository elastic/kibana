/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiLink, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/css';
import { SESSION_VIEW_UPSELL_TEST_ID, SESSION_VIEW_NO_DATA_TEST_ID } from './test_ids';

interface SessionViewNoDataMessageProps {
  /**
   * Whether the user has an Enterprise Plus license
   */
  isEnterprisePlus: boolean;
  /**
   * Whether the user has Session View configuration
   */
  hasSessionViewConfig: boolean;
}

/**
 * Message displayed when the user does not have access to Session View
 */
export const SessionViewNoDataMessage: FC<SessionViewNoDataMessageProps> = ({
  isEnterprisePlus,
  hasSessionViewConfig,
}) => {
  const { euiTheme } = useEuiTheme();

  return !isEnterprisePlus ? (
    <div data-test-subj={SESSION_VIEW_UPSELL_TEST_ID}>
      <FormattedMessage
        id={'xpack.securitySolution.flyout.sessionViewer.upsellDescription'}
        defaultMessage="This feature requires an {subscription}"
        values={{
          subscription: (
            <EuiLink href="https://www.elastic.co/pricing/" target="_blank">
              <FormattedMessage
                id={'xpack.securitySolution.flyout.sessionViewer.upsellLinkText'}
                defaultMessage="Enterprise subscription"
              />
            </EuiLink>
          ),
        }}
      />
    </div>
  ) : !hasSessionViewConfig ? (
    <div data-test-subj={SESSION_VIEW_NO_DATA_TEST_ID}>
      <FormattedMessage
        id={'xpack.securitySolution.flyout.sessionViewer.noDataDescription'}
        defaultMessage="You can only view Linux session details if you’ve enabled the {setting} setting in your Elastic Defend integration policy. Refer to {link} for more information."
        values={{
          setting: (
            <span
              css={css`
                font-weight: ${euiTheme.font.weight.bold};
              `}
            >
              <FormattedMessage
                id={'xpack.securitySolution.flyout.sessionViewer.noDataSettingDescription'}
                defaultMessage="Include session data"
              />
            </span>
          ),
          link: (
            <EuiLink
              href="https://www.elastic.co/guide/en/security/current/session-view.html#enable-session-view"
              target="_blank"
            >
              <FormattedMessage
                id={'xpack.securitySolution.flyout.sessionViewer.noDataLinkText'}
                defaultMessage="Enable Session View data"
              />
            </EuiLink>
          ),
        }}
      />
    </div>
  ) : null;
};

SessionViewNoDataMessage.displayName = 'SessionViewNoDataMessage';
