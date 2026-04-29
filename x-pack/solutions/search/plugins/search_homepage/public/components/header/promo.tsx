/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiPanel, EuiText, EuiTitle, EuiSpacer, EuiFlexGroup } from '@elastic/eui';
import { FeatureUpdateGroup } from './feature_update_group';

export interface HeaderPromoProps {
  title: React.ReactNode;
  description: React.ReactNode;
  updates?: React.ReactNode[];
  actions: React.ReactNode[];
}

export const HeaderPromo = ({ title, description, updates, actions }: HeaderPromoProps) => {
  return (
    <EuiPanel color="transparent" paddingSize="none">
      <EuiTitle size="l">
        <h1>{title}</h1>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiText grow={false}>
        <p>{description}</p>
      </EuiText>
      <EuiSpacer size="m" />
      {updates && updates.length > 0 ? <FeatureUpdateGroup updates={updates} /> : null}
      <EuiFlexGroup alignItems="center" gutterSize="m">
        {actions}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
