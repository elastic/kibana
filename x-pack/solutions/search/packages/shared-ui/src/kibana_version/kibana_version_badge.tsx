/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiFlexGroup, EuiLink } from '@elastic/eui';
import React from 'react';

interface KibanaVersionBadgeProps {
  kibanaVersion: string;
  docLink: string;
}
export const KibanaVersionBadge: React.FC<KibanaVersionBadgeProps> = ({
  kibanaVersion,
  docLink,
}) => {
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiLink data-test-subj="kibana-version-badge" color="text" target="_blank" href={docLink}>
          {kibanaVersion}
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
