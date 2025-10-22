/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { EuiCallOut, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from './translations';

/**
 * Basic EuiCallout showing missing privileges information
 */
export const BasicMissingPrivilegesCallOut = React.memo<PropsWithChildren<{}>>(({ children }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiCallOut
      title={i18n.PRIVILEGES_MISSING_TITLE}
      iconType="info"
      css={css`
        border-radius: ${euiTheme.border.radius.small};
        border: 1px solid ${euiTheme.colors.borderBaseSubdued};
      `}
    >
      {children}
    </EuiCallOut>
  );
});
BasicMissingPrivilegesCallOut.displayName = 'BasicMissingPrivilegesCallOut';
