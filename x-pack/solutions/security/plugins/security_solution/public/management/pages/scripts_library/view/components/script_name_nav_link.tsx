/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiLink } from '@elastic/eui';

export interface ScriptNameNavLinkProps {
  name: string;
  onClick: () => void;
  'data-test-subj'?: string;
}

export const ScriptNameNavLink = memo<ScriptNameNavLinkProps>(
  ({ name, onClick, 'data-test-subj': dataTestSubj }) => {
    return (
      <EuiLink
        data-test-subj={`${dataTestSubj}-name-button`}
        className="eui-displayInline eui-textTruncate"
        onClick={onClick}
      >
        {name}
      </EuiLink>
    );
  }
);
ScriptNameNavLink.displayName = 'ScriptNameNavLink';
