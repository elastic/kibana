/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';

/**
 * Small bold section heading shared by the attachment inline renderers. `suffix` renders
 * inline after the heading text (e.g. a threshold tooltip) inside the same text block.
 */
export const SectionHeading: React.FC<{ children: React.ReactNode; suffix?: React.ReactNode }> = ({
  children,
  suffix,
}) => (
  <EuiText size="s">
    <strong>{children}</strong>
    {suffix ? <> {suffix}</> : null}
  </EuiText>
);
