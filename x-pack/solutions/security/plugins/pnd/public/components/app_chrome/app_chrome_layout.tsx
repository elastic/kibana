/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { useLocation } from 'react-router-dom';
import { AskPndFab } from './pnd_chrome';
import { PndSideNav } from './pnd_side_nav';

interface AppChromeLayoutProps {
  children: React.ReactNode;
}

/**
 * App shell for PND: an in-app left navigation rail (Watch Floor + Operate +
 * Autonomous groups, mirroring the Throughline prototype) plus the routed
 * content. The rail is rendered by the app so it is present in classic Kibana
 * as well as serverless; Kibana / Security solution chrome still owns the top
 * header and the outer platform rail.
 */
export const AppChromeLayout: React.FC<AppChromeLayoutProps> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  const location = useLocation();
  const isChats = location.pathname.startsWith('/chats');

  return (
    <div
      css={css`
        display: flex;
        flex-direction: row;
        flex: 1;
        min-height: 0;
        background: ${euiTheme.colors.body};
      `}
      data-test-subj="pndAppChromeLayout"
    >
      <PndSideNav />
      <div
        css={css`
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
          min-height: 0;
          overflow: ${isChats ? 'hidden' : 'auto'};
        `}
      >
        {children}
        <AskPndFab />
      </div>
    </div>
  );
};
