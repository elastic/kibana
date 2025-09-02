/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiPanel, EuiText, EuiTitle, EuiSpacer } from '@elastic/eui';
import { FeatureUpdateGroup } from './feature_update_group';

export interface HeaderPromoProps {
  title: React.ReactNode;
  description: React.ReactNode;
  updates?: React.ReactNode[];
  cta: React.ReactNode;
}

export const HeaderPromo = ({ title, description, updates, cta }: HeaderPromoProps) => {
  return (
    <EuiPanel color="transparent" paddingSize="xl">
      <EuiTitle size="l">
        <h1>{title}</h1>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiText grow={false}>
        <p>{description}</p>
      </EuiText>
      <EuiSpacer size="xl" />
      {updates && updates.length > 0 ? <FeatureUpdateGroup updates={updates} /> : null}
      {cta}
    </EuiPanel>
  );
};
