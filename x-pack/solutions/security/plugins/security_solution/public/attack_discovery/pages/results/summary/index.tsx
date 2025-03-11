/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

import { SummaryCount } from './summary_count';
import { SHOW_REAL_VALUES, SHOW_ANONYMIZED_LABEL } from '../../translations';

interface Props {
  alertsCount: number;
  attackDiscoveriesCount: number;
  lastUpdated: Date | null;
  onToggleShowAnonymized: () => void;
  showAnonymized: boolean;
}

const SummaryComponent: React.FC<Props> = ({
  alertsCount,
  attackDiscoveriesCount,
  lastUpdated,
  onToggleShowAnonymized,
  showAnonymized,
}) => (
  <EuiFlexGroup data-test-subj="summary" justifyContent="spaceBetween">
    <EuiFlexItem grow={false}>
      <SummaryCount
        alertsCount={alertsCount}
        attackDiscoveriesCount={attackDiscoveriesCount}
        lastUpdated={lastUpdated}
      />
      <EuiSpacer size="l" />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiToolTip
        content={showAnonymized ? SHOW_REAL_VALUES : SHOW_ANONYMIZED_LABEL}
        data-test-subj="toggleAnonymizedToolTip"
      >
        <EuiButtonIcon
          aria-label={showAnonymized ? SHOW_REAL_VALUES : SHOW_ANONYMIZED_LABEL}
          css={css`
            border-radius: 50%;
          `}
          data-test-subj="toggleAnonymized"
          iconType={showAnonymized ? 'eye' : 'eyeClosed'}
          onClick={onToggleShowAnonymized}
        />
      </EuiToolTip>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const Summary = React.memo(SummaryComponent);
