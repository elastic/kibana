/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PropsWithChildren } from 'react';
import React from 'react';
import {
  EuiCallOut,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from './translations';

export const MissingPrivilegesDescription = React.memo<{ privileges: string[] }>(
  ({ privileges }) => {
    return (
      <EuiFlexGroup gutterSize="m" direction="column" data-test-subj="missingPrivilegesGroup">
        <EuiFlexItem>{i18n.PRIVILEGES_REQUIRED_TITLE}</EuiFlexItem>
        <EuiFlexItem>
          <EuiCode>
            <ul>
              {privileges.map((privilege) => (
                <li key={privilege}>{privilege}</li>
              ))}
            </ul>
          </EuiCode>
        </EuiFlexItem>
        <EuiFlexItem>{i18n.CONTACT_ADMINISTRATOR}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
MissingPrivilegesDescription.displayName = 'MissingPrivilegesDescription';

interface MissingPrivilegesTooltip {
  children: React.ReactElement; // EuiToolTip requires a single ReactElement child
  description: React.ReactNode;
}
export const MissingPrivilegesTooltip = React.memo<MissingPrivilegesTooltip>(
  ({ children, description }) => (
    <EuiToolTip
      anchorProps={{ style: { width: 'fit-content' } }}
      title={i18n.PRIVILEGES_MISSING_TITLE}
      content={description}
    >
      {children}
    </EuiToolTip>
  )
);
MissingPrivilegesTooltip.displayName = 'MissingPrivilegesTooltip';

export const MissingPrivilegesCallOut = React.memo<PropsWithChildren<{}>>(({ children }) => {
  const { euiTheme } = useEuiTheme();
  const calloutCss = css`
    border-radius: ${euiTheme.border.radius.small};
    border: 1px solid ${euiTheme.colors.borderBaseSubdued};
  `;
  return (
    <EuiCallOut title={i18n.PRIVILEGES_MISSING_TITLE} iconType="iInCircle" css={calloutCss}>
      {children}
    </EuiCallOut>
  );
});
MissingPrivilegesCallOut.displayName = 'MissingPrivilegesCallOut';
