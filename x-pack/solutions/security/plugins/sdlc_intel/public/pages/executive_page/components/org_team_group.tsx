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
import { getTeamAccent } from '../../teams_page/lib/team_accents';
import type { ExecutiveOrgTeamGroup } from '../lib/executive_filters';
import { getCoverageLevel } from '../lib/coverage_utils';
import { SubteamGroup } from './subteam_group';

export const OrgTeamGroup = ({
  orgTeam,
  expandAll,
}: {
  orgTeam: ExecutiveOrgTeamGroup;
  expandAll: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const accent = getTeamAccent(orgTeam.orgTeamKey);
  const averageCoverage = useMemo(() => {
    const epics = orgTeam.subteams.flatMap((subteam) =>
      subteam.roadmaps.flatMap((roadmap) => roadmap.epics)
    );
    if (epics.length === 0) {
      return 0;
    }

    return Math.round(epics.reduce((sum, epic) => sum + epic.coveragePct, 0) / epics.length);
  }, [orgTeam.subteams]);
  const coverageLevel = getCoverageLevel(averageCoverage);
  const subteamCount = orgTeam.subteams.length;

  return (
    <section
      css={css`
        margin-bottom: ${euiTheme.size.l};
      `}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={accent.icon} color="subdued" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>{orgTeam.orgTeamName}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.sdlcIntel.executive.orgTeam.subteamCount"
              defaultMessage="{count, plural, one {# subteam} other {# subteams}}"
              values={{ count: subteamCount }}
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
          margin-top: ${euiTheme.size.m};
          padding-left: ${euiTheme.size.m};
          border-left: 3px solid ${accent.color};
        `}
      >
        {orgTeam.subteams.map((subteam) => (
          <SubteamGroup key={subteam.subteamKey} subteam={subteam} expandAll={expandAll} />
        ))}
      </div>
    </section>
  );
};
