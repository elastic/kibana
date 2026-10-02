/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';

interface LinkPillProps {
  label: string;
  href: string;
}

/** Renders a badge that opens a Security page in a new tab. */
export const LinkPill = ({ label, href }: LinkPillProps) => (
  <EuiBadge href={href} target="_blank" rel="noopener noreferrer" color="hollow">
    {label}
  </EuiBadge>
);

interface ActionPillProps {
  label: string;
  onClick: () => void;
}

/** Renders a badge that triggers a flyout-opening action. */
export const ActionPill = ({ label, onClick }: ActionPillProps) => (
  <EuiBadge onClick={onClick} onClickAriaLabel={label} color="hollow">
    {label}
  </EuiBadge>
);
