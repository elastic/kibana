/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';

import { useDataQualityContext } from '../../../../../data_quality_context';
import {
  ALL_FIELDS,
  CUSTOM_FIELDS,
  DOCS,
  ECS_COMPLIANT_FIELDS,
  ILM_PHASE,
  SIZE,
} from '../../../../../translations';
import { Stat } from '../../../../../stat';
import { getIlmPhaseDescription } from '../../../../../utils/get_ilm_phase_description';

const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  const { fontSize } = useEuiFontSize('xs');

  const baseFlexItem = css`
    justify-content: space-between;
    border-right: 1px solid ${euiTheme.border.color};
    font-size: ${fontSize};

    &:last-child {
      border-right: none;
    }

    strong {
      text-transform: capitalize;
    }
  `;

  return {
    flexItem: css`
      ${baseFlexItem}
      margin-bottom: 2px;
    `,
    unpaddedFlexItem: css`
      ${baseFlexItem}
      margin-bottom: 0;
    `,
  };
};

export interface Props {
  docsCount: number;
  ilmPhase?: string;
  sizeInBytes?: number;
  ecsCompliantFieldsCount?: number;
  customFieldsCount?: number;
  allFieldsCount?: number;
}

export const IndexStatsPanelComponent: React.FC<Props> = ({
  docsCount,
  ilmPhase,
  sizeInBytes,
  customFieldsCount,
  ecsCompliantFieldsCount,
  allFieldsCount,
}) => {
  const styles = useStyles();
  const { formatBytes, formatNumber } = useDataQualityContext();
  return (
    <EuiPanel data-test-subj="indexStatsPanel" paddingSize="s" hasShadow={false} hasBorder={true}>
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem css={styles.flexItem}>
          <strong>{DOCS}</strong>
          <EuiSpacer />
          {formatNumber(docsCount)}
        </EuiFlexItem>
        {ilmPhase && (
          <EuiFlexItem css={styles.unpaddedFlexItem}>
            <strong>{ILM_PHASE}</strong>
            <EuiSpacer />
            <Stat
              badgeText={ilmPhase}
              tooltipText={getIlmPhaseDescription(ilmPhase)}
              badgeProps={{ 'data-test-subj': 'ilmPhase' }}
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem css={styles.flexItem}>
          <strong>{SIZE}</strong>
          <EuiSpacer />
          {formatBytes(sizeInBytes ?? 0)}
        </EuiFlexItem>
        {customFieldsCount != null && (
          <EuiFlexItem css={styles.flexItem}>
            <strong>{CUSTOM_FIELDS}</strong>
            <EuiSpacer />
            {formatNumber(customFieldsCount)}
          </EuiFlexItem>
        )}
        {ecsCompliantFieldsCount != null && (
          <EuiFlexItem css={styles.flexItem}>
            <strong>{ECS_COMPLIANT_FIELDS}</strong>
            <EuiSpacer />
            {formatNumber(ecsCompliantFieldsCount)}
          </EuiFlexItem>
        )}
        {allFieldsCount != null && (
          <EuiFlexItem css={styles.flexItem}>
            <strong>{ALL_FIELDS}</strong>
            <EuiSpacer />
            {formatNumber(allFieldsCount)}
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

IndexStatsPanelComponent.displayName = 'IndexStatsPanelComponent';

export const IndexStatsPanel = React.memo(IndexStatsPanelComponent);
