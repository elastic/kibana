/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';

import { RiskScorePreviewSection } from './risk_score_preview_section';
import { RiskScoreUsefulLinksSection } from './risk_score_useful_links_section';
export const RiskScoreTab: React.FC = () => {
  return (
    <>
      <EuiFlexGroup gutterSize="xl" alignItems="flexStart">
        <EuiFlexItem grow={2}>
          <RiskScoreUsefulLinksSection />
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <RiskScorePreviewSection
            hasReadPermissions={true}
            isPrivilegesLoading={false}
            includeClosedAlerts={false}
            from="now-30d"
            to="now"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </>
  );
};
