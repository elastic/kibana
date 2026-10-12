/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiText, EuiTitle, EuiSpacer } from '@elastic/eui';

interface SectionTitleProps {
  index: number;
  title: string;
  subtitle: string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ index, title, subtitle }) => (
  <>
    <EuiTitle size="s">
      <h3>{`${index}. ${title}`}</h3>
    </EuiTitle>
    <EuiSpacer size="xs" />
    <EuiText size="s" color="subdued">
      <p>{subtitle}</p>
    </EuiText>
    <EuiSpacer size="m" />
  </>
);
