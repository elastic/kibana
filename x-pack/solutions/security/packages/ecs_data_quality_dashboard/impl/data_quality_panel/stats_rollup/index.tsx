/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';

import { EMPTY_STAT } from '../constants';
import { useDataQualityContext } from '../data_quality_context';
import * as i18n from '../stat_label/translations';
import { Stat } from '../stat';
import { getIncompatibleStatBadgeColor } from '../utils/get_incompatible_stat_badge_color';

const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    statWrapper: css({
      padding: `0 ${euiTheme.size.base}`,
      borderRight: euiTheme.border.thin,
      borderColor: euiTheme.border.color,

      '&:last-child': {
        paddingRight: 0,
        borderRight: 'none',
      },
      '&:first-child': {
        paddingLeft: 0,
      },
    }),
  };
};

interface Props {
  docsCount?: number;
  incompatible?: number;
  indices?: number;
  indicesChecked?: number;
  pattern?: string;
  sizeInBytes?: number;
}

const StatsRollupComponent: React.FC<Props> = ({
  docsCount,
  incompatible,
  indices,
  indicesChecked,
  pattern,
  sizeInBytes,
}) => {
  const styles = useStyles();
  const { formatNumber, formatBytes } = useDataQualityContext();

  return (
    <EuiFlexGroup
      alignItems="flexEnd"
      data-test-subj="statsRollup"
      gutterSize="none"
      justifyContent="flexEnd"
    >
      <EuiFlexItem css={styles.statWrapper} grow={false}>
        <Stat
          tooltipText={
            pattern != null
              ? i18n.TOTAL_INCOMPATIBLE_PATTERN_TOOL_TIP
              : i18n.TOTAL_INCOMPATIBLE_TOOL_TIP
          }
          badgeText={incompatible != null ? formatNumber(incompatible) : EMPTY_STAT}
          badgeColor={getIncompatibleStatBadgeColor(incompatible)}
        >
          {i18n.INCOMPATIBLE_FIELDS}
        </Stat>
      </EuiFlexItem>

      <EuiFlexItem css={styles.statWrapper} grow={false}>
        <Stat
          tooltipText={
            pattern != null
              ? i18n.TOTAL_CHECKED_INDICES_PATTERN_TOOL_TIP
              : i18n.TOTAL_CHECKED_INDICES_TOOL_TIP
          }
          badgeText={indicesChecked != null ? formatNumber(indicesChecked) : EMPTY_STAT}
        >
          {i18n.INDICES_CHECKED}
        </Stat>
      </EuiFlexItem>

      <EuiFlexItem css={styles.statWrapper} grow={false}>
        <Stat
          tooltipText={
            pattern != null ? i18n.TOTAL_INDICES_PATTERN_TOOL_TIP : i18n.TOTAL_INDICES_TOOL_TIP
          }
          badgeText={indices != null ? formatNumber(indices) : '0'}
        >
          {i18n.INDICES}
        </Stat>
      </EuiFlexItem>

      {sizeInBytes != null && (
        <EuiFlexItem css={styles.statWrapper} grow={false}>
          <Stat
            tooltipText={
              pattern != null ? i18n.TOTAL_SIZE_PATTERN_TOOL_TIP : i18n.TOTAL_SIZE_TOOL_TIP
            }
            badgeText={sizeInBytes != null ? formatBytes(sizeInBytes) : EMPTY_STAT}
          >
            {i18n.SIZE}
          </Stat>
        </EuiFlexItem>
      )}

      <EuiFlexItem css={styles.statWrapper} grow={false}>
        <Stat
          tooltipText={
            pattern != null ? i18n.TOTAL_DOCS_PATTERN_TOOL_TIP : i18n.TOTAL_DOCS_TOOL_TIP
          }
          badgeText={docsCount != null ? formatNumber(docsCount) : EMPTY_STAT}
        >
          {i18n.DOCS}
        </Stat>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

StatsRollupComponent.displayName = 'StatsRollupComponent';

export const StatsRollup = React.memo(StatsRollupComponent);
