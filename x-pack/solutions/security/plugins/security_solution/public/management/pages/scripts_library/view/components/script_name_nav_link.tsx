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
  href: string;
  'data-test-subj'?: string;
}

export const ScriptNameNavLink = memo<ScriptNameNavLinkProps>(
  ({ name, href, 'data-test-subj': dataTestSubj }) => {
    return (
      <EuiLink
        data-test-subj={dataTestSubj}
        className="eui-displayInline eui-textTruncate"
        href={href}
        target="_self"
      >
        {name}
      </EuiLink>
    );
  }
);
ScriptNameNavLink.displayName = 'ScriptNameNavLink';
