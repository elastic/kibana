/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBetaBadge } from '@elastic/eui';

import * as i18n from './translations';

interface TechnicalPreviewBadgeProps {
  label: string;
}

export const TechnicalPreviewBadge = ({ label }: TechnicalPreviewBadgeProps) => (
  <>
    {label}
    <EuiBetaBadge
      label={i18n.TECHNICAL_PREVIEW}
      style={{ verticalAlign: 'middle', marginLeft: '8px' }}
      size="s"
    />
  </>
);
