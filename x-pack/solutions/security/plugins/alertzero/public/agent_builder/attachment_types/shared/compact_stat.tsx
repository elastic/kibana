/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiStat } from '@elastic/eui';

/**
 * `EuiStat` with the four props every call site in the attachment renderers repeats:
 * span title/description elements (no implicit heading levels), small title, left-aligned.
 */
export const CompactStat: React.FC<{ title: React.ReactNode; description: React.ReactNode }> = ({
  title,
  description,
}) => (
  <EuiStat
    titleElement="span"
    descriptionElement="span"
    titleSize="s"
    textAlign="left"
    title={title}
    description={description}
  />
);
