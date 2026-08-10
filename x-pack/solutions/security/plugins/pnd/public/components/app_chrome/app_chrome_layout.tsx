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

interface AppChromeLayoutProps {
  children: React.ReactNode;
}

/**
 * Content shell only — Kibana / Security solution chrome owns the top header
 * and left rail (including Launchpad, Dev Tools, Settings, collapse).
 */
export const AppChromeLayout: React.FC<AppChromeLayoutProps> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  const location = useLocation();
  const isChats = location.pathname.startsWith('/chats');

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        overflow: ${isChats ? 'hidden' : 'auto'};
        background: ${euiTheme.colors.body};
      `}
      data-test-subj="pndAppChromeLayout"
    >
      {children}
      <AskPndFab />
    </div>
  );
};
