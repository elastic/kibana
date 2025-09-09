/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import * as i18n from './translations';

export interface MissingPrivilegesDescriptionProps {
  /**
   * Missing privileges to display
   */
  privileges: string[];
}

/**
 * Show a EuiCode component explaining the required missing privileges
 */
export const MissingPrivilegesDescription = React.memo(
  ({ privileges }: MissingPrivilegesDescriptionProps) => {
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
