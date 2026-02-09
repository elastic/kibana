/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiText } from '@elastic/eui';

export interface ErrorCalloutProps {
  /** Title of the error callout */
  title: string;
  /** Error message to display */
  message: string;
  /** Color of the callout (warning or danger) */
  color?: 'warning' | 'danger';
  /** Icon type */
  iconType?: string;
  /** Size of the callout */
  size?: 's' | 'm';
}

/**
 * Reusable error callout component.
 */
export const ErrorCallout: React.FC<ErrorCalloutProps> = ({
  title,
  message,
  color = 'danger',
  iconType = color === 'danger' ? 'error' : 'warning',
  size,
}) => (
  <EuiCallOut announceOnMount title={title} color={color} iconType={iconType} size={size}>
    <EuiText size="s">{message}</EuiText>
  </EuiCallOut>
);
