/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiProgress,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SdlcRoadmapGroup } from '../../../../common/api/types';
import { getCoverageLevel } from '../lib/coverage_utils';
import { RoadmapCard } from './roadmap_card';

export const ProductGroup = ({
  product,
  roadmaps,
  expandAll,
}: {
  product: string;
  roadmaps: readonly SdlcRoadmapGroup[];
  expandAll: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const averageCoverage = useMemo(() => {
    if (roadmaps.length === 0) {
      return 0;
    }

    return Math.round(
      roadmaps.reduce((sum, roadmap) => sum + roadmap.coveragePct, 0) / roadmaps.length
    );
  }, [roadmaps]);
  const coverageLevel = getCoverageLevel(averageCoverage);

  return (
    <section
      css={css`
        margin-bottom: ${euiTheme.size.l};
      `}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="globe" color="subdued" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>{product}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.sdlcIntel.executive.product.roadmapCount"
              defaultMessage="{count, plural, one {# roadmap} other {# roadmaps}}"
              values={{ count: roadmaps.length }}
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem style={{ maxWidth: 120 }}>
          <EuiProgress
            value={averageCoverage}
            max={100}
            size="s"
            color={coverageLevel === 'good' ? 'success' : coverageLevel === 'amber' ? 'warning' : 'danger'}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <strong>{averageCoverage}%</strong>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <div
        css={css`
          margin-top: ${euiTheme.size.s};
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.s};
        `}
      >
        {roadmaps.map((roadmap) => (
          <RoadmapCard
            key={roadmap.id}
            roadmap={roadmap}
            forceOpen={expandAll}
            forceEpicsOpen={expandAll}
          />
        ))}
      </div>
    </section>
  );
};
