/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiLink, EuiToolTip } from '@elastic/eui';

interface ExternalLinkProps {
  url: string;
  children?: React.ReactNode;
  ariaLabel?: string;
}

/**
 * A link for opening external urls in a new browser tab.
 */
export const ExternalLink: FC<ExternalLinkProps> = ({ url, children, ariaLabel }) => {
  if (!children) {
    return null;
  }

  return (
    <EuiToolTip content={url} position="top" data-test-subj="externalLinkTooltip">
      <EuiLink
        href={url}
        aria-label={ariaLabel}
        external
        target="_blank"
        rel="noopener"
        data-test-subj="externalLink"
      >
        {children}
      </EuiLink>
    </EuiToolTip>
  );
};
