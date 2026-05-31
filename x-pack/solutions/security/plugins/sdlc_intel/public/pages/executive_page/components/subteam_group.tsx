/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiText, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SdlcRoadmapGroup } from '../../../../common/api/types';
import type { ExecutiveSubteamGroup } from '../lib/executive_filters';
import { getCoverageLevel } from '../lib/coverage_utils';
import { RoadmapCard } from './roadmap_card';

export const SubteamGroup = ({
  subteam,
  expandAll,
}: {
  subteam: ExecutiveSubteamGroup;
  expandAll: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const averageCoverage = useMemo(() => {
    const epics = subteam.roadmaps.flatMap((roadmap) => roadmap.epics);
    if (epics.length === 0) {
      return 0;
    }

    return Math.round(epics.reduce((sum, epic) => sum + epic.coveragePct, 0) / epics.length);
  }, [subteam.roadmaps]);
  const coverageLevel = getCoverageLevel(averageCoverage);
  const epicCount = subteam.roadmaps.reduce((count, roadmap) => count + roadmap.epicCount, 0);

  return (
    <section
      css={css`
        margin-bottom: ${euiTheme.size.m};
      `}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>{subteam.subteamName}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.sdlcIntel.executive.subteam.epicCount"
              defaultMessage="{count, plural, one {# epic} other {# epics}}"
              values={{ count: epicCount }}
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
        {subteam.roadmaps.map((roadmap: SdlcRoadmapGroup) => (
          <RoadmapCard
            key={`${subteam.subteamKey}-${roadmap.id}`}
            roadmap={roadmap}
            forceOpen={expandAll}
            forceEpicsOpen={expandAll}
          />
        ))}
      </div>
    </section>
  );
};
