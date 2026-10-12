/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiBasicTable, EuiBadge, EuiIcon, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { KbnDangerCallout, KbnInfoCallout, KbnWarningCallout } from '@kbn/ui-callout';
import type {
  AttentionLevel,
  BlindSpotGap,
  BlindSpotGroup,
  BriefSnapshot,
  ExecutiveBrief,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { useKibana } from '../../../../common/lib/kibana';
import { ClaimFlag, useIsPrintMode } from '../components/brief_context';
import { SectionTitle } from '../components/section_title';
import {
  BRIEF_BLOCK_ATTRIBUTE,
  BRIEF_CUT_ATTRIBUTE,
  BRIEF_KEEP_WITH_NEXT_ATTRIBUTE,
  EXECUTIVE_BRIEF_SECTION_IDS,
} from '../constants';
import { TEST_IDS } from '../test_ids';
import { AttackStages } from './attack_stages';
import { pickBlindSpotHeadline } from './blind_spots_headline';

const GROUP_LABEL: Record<BlindSpotGroup, string> = {
  detection_coverage: 'Detection coverage',
  data_not_collected: 'Data not collected',
  analytics_not_running: 'Analytics not running',
  context_missing: 'Context missing',
  attribution_gap: 'Attribution gaps',
  response_gap: 'Response gaps',
};

// The callout follows the Detection coverage traffic light so its colour means the same thing.
const HEADLINE_CALLOUT: Record<AttentionLevel, typeof KbnWarningCallout> = {
  urgent: KbnDangerCallout,
  action: KbnWarningCallout,
  watch: KbnInfoCallout,
  clear: KbnInfoCallout,
};

const SEVERITY_RANK: Record<BlindSpotGap['severity'], number> = { danger: 0, warning: 1, info: 2 };

interface BlindSpotsProps {
  snapshot: BriefSnapshot;
  blindSpots: ExecutiveBrief['blindSpots'];
}

export const BlindSpots: React.FC<BlindSpotsProps> = ({ snapshot, blindSpots }) => {
  const { application, http } = useKibana().services;
  const isPrintMode = useIsPrintMode();
  const { attackStages, gaps } = snapshot.blindSpots;

  const goTo = (href: string) => application.navigateToUrl(http.basePath.prepend(href));

  const headline = useMemo(() => pickBlindSpotHeadline(snapshot), [snapshot]);
  const headlineStage = headline?.stage;
  const coverageLevel = snapshot.glance.assessment?.areas.find(
    ({ id }) => id === 'coverage'
  )?.level;
  const HeadlineCallout = HEADLINE_CALLOUT[coverageLevel ?? 'action'];

  // Most severe first (danger, warning, info), then by gap group.
  const sortedGaps = useMemo(
    () =>
      [...gaps].sort(
        (a, b) =>
          SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
          Object.keys(GROUP_LABEL).indexOf(a.group) - Object.keys(GROUP_LABEL).indexOf(b.group)
      ),
    [gaps]
  );

  const columns: Array<EuiBasicTableColumn<BlindSpotGap>> = [
    {
      field: 'severity',
      name: '',
      width: '32px',
      render: (severity: BlindSpotGap['severity']) => (
        <EuiIcon
          type={severity === 'info' ? 'info' : 'warning'}
          color={severity === 'danger' ? 'danger' : severity === 'warning' ? 'warning' : 'subdued'}
          aria-label={severity}
        />
      ),
    },
    {
      field: 'title',
      name: 'Gap',
      render: (title: string, gap: BlindSpotGap) => (
        <>
          <EuiText size="s">
            <strong>{title}</strong>
          </EuiText>
          {gap.detail && (
            <EuiText size="xs" color="subdued">
              {gap.detail}
            </EuiText>
          )}
        </>
      ),
    },
    {
      field: 'group',
      name: 'Group',
      render: (group: BlindSpotGroup) => <EuiBadge color="hollow">{GROUP_LABEL[group]}</EuiBadge>,
    },
    {
      field: 'value',
      name: 'Scope',
      render: (value: number | undefined) => (value !== undefined ? value : '-'),
    },
    {
      field: 'fixHref',
      name: 'Fix',
      render: (fixHref: string | undefined, gap: BlindSpotGap) =>
        fixHref && isPrintMode ? (
          gap.fixLabel ?? 'Fix'
        ) : fixHref ? (
          <EuiLink
            external={false}
            href={http.basePath.prepend(fixHref)}
            onClick={(event: React.MouseEvent) => {
              event.preventDefault();
              goTo(fixHref);
            }}
          >
            {gap.fixLabel ?? 'Fix'}
          </EuiLink>
        ) : null,
    },
  ];

  return (
    <section id={EXECUTIVE_BRIEF_SECTION_IDS.blindSpots} data-test-subj="executiveBriefBlindSpots">
      <div
        {...{
          [BRIEF_BLOCK_ATTRIBUTE]: 'blind-spots-callout',
          [BRIEF_KEEP_WITH_NEXT_ATTRIBUTE]: '',
        }}
      >
        <SectionTitle
          index={3}
          title="Blind spots"
          subtitle="Attack stages with weak detection coverage, and data or analytics gaps that limit this brief"
        />
        {headline && headlineStage && (
          <>
            <HeadlineCallout
              title={headline.title}
              actionProps={
                isPrintMode
                  ? undefined
                  : {
                      primary: {
                        children: 'Review coverage',
                        onClick: () => goTo('/app/security/rules_coverage_overview'),
                      },
                    }
              }
              data-test-subj="executiveBriefHeadlineGap"
            >
              {`${headlineStage.coverage.effective} of ${headlineStage.coverage.enabled} enabled rules are working and ${headlineStage.observed.alerts} alerts were seen.`}
            </HeadlineCallout>
            <EuiSpacer size="m" />
          </>
        )}
      </div>
      <div {...{ [BRIEF_BLOCK_ATTRIBUTE]: 'attack-stage-grid' }}>
        <AttackStages summary={attackStages} />
        <EuiSpacer size="l" />
      </div>
      <div {...{ [BRIEF_BLOCK_ATTRIBUTE]: 'gap-table' }}>
        <EuiBasicTable<BlindSpotGap>
          tableCaption="Other visibility gaps"
          items={sortedGaps}
          columns={columns}
          rowProps={(gap) => (gap === sortedGaps[0] ? {} : { [BRIEF_CUT_ATTRIBUTE]: '' })}
          data-test-subj={TEST_IDS.gapsTable}
        />
        <EuiSpacer size="m" />
      </div>
      <div {...{ [BRIEF_BLOCK_ATTRIBUTE]: 'blind-spots-summary' }}>
        <EuiText size="s" data-test-subj="executiveBriefBlindSpotsSummary">
          <p>
            {blindSpots.summary} <ClaimFlag claimPath="blindSpots" />
          </p>
        </EuiText>
      </div>
    </section>
  );
};
