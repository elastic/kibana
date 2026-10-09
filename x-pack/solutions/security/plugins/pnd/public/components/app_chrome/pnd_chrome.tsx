/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiButton, useEuiTheme } from '@elastic/eui';
import { useHistory, useLocation } from 'react-router-dom';
import * as i18n from './translations';

/** Floating Ask PND control — routes to in-app Chats (Agent Builder embed). */
export const AskPndFab: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const location = useLocation();

  if (location.pathname.startsWith('/chats')) {
    return null;
  }

  return (
    <div
      data-test-subj="pndAskFab"
      css={css`
        position: fixed;
        left: 50%;
        bottom: ${euiTheme.size.l};
        z-index: 10;
        transform: translateX(-50%);
      `}
    >
      <EuiButton
        fill
        iconType="sparkles"
        aria-label={i18n.ASK_PND_LABEL}
        onClick={() => history.push('/chats')}
        css={css`
          border-radius: 999px;
          box-shadow: ${euiTheme.shadows.l.down};
        `}
      >
        {i18n.ASK_PND_LABEL}
      </EuiButton>
    </div>
  );
};
