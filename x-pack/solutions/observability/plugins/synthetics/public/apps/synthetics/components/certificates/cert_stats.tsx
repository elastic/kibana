/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiText } from '@elastic/eui';
import type { CertStats as CertStatsType } from '../../../../../common/runtime_types';
import * as labels from './translations';

interface Props {
  stats?: CertStatsType;
}

export const CertStats: React.FC<Props> = ({ stats }) => {
  if (!stats) {
    return null;
  }

  const { expiringSoon, expired } = stats;

  return (
    <EuiFlexGroup gutterSize="l" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiHealth color={expiringSoon > 0 ? 'warning' : 'subdued'}>
          <EuiText size="s" data-test-subj="certStatExpiringSoon">
            {labels.STAT_EXPIRING_SOON}: <strong>{expiringSoon}</strong>
          </EuiText>
        </EuiHealth>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiHealth color={expired > 0 ? 'danger' : 'subdued'}>
          <EuiText size="s" data-test-subj="certStatExpired">
            {labels.STAT_EXPIRED}: <strong>{expired}</strong>
          </EuiText>
        </EuiHealth>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
