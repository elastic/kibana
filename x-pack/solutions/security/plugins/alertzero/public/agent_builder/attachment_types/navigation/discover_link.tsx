/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';

export interface DiscoverLinkProps {
  href?: string;
  children: React.ReactNode;
  testSubj: string;
}

/**
 * Renders an external Discover (or other) href as a new-tab link, or plain text when href is missing.
 */
export const DiscoverLink: React.FC<DiscoverLinkProps> = ({ href, children, testSubj }) =>
  href ? (
    <EuiLink href={href} target="_blank" rel="noopener noreferrer" data-test-subj={testSubj}>
      {children}
    </EuiLink>
  ) : (
    <span data-test-subj={testSubj}>{children}</span>
  );
