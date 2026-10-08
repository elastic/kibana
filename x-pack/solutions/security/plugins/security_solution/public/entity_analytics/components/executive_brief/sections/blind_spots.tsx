/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiBasicTable, EuiBadge, EuiIcon, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type {
  BlindSpotGap,
  BlindSpotGroup,
  BriefSnapshot,
  ExecutiveBrief,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { useKibana } from '../../../../common/lib/kibana';
import { SectionTitle } from '../components/section_title';
import { EXECUTIVE_BRIEF_SECTION_IDS } from '../constants';
import { TEST_IDS } from '../test_ids';
import { AttackStages } from './attack_stages';

const GROUP_LABEL: Record<BlindSpotGroup, string> = {
  detection_coverage: 'Detection coverage',
  data_not_collected: 'Data not collected',
  analytics_not_running: 'Analytics not running',
  context_missing: 'Context missing',
  attribution_gap: 'Attribution gaps',
  response_gap: 'Response gaps',
};

const SEVERITY_RANK: Record<BlindSpotGap['severity'], number> = { danger: 0, warning: 1, info: 2 };

interface BlindSpotsProps {
  snapshot: BriefSnapshot;
  blindSpots: ExecutiveBrief['blindSpots'];
}

export const BlindSpots: React.FC<BlindSpotsProps> = ({ snapshot, blindSpots }) => {
  const { application, http } = useKibana().services;
  const { attackStages, gaps } = snapshot.blindSpots;

  const goTo = (href: string) => application.navigateToUrl(http.basePath.prepend(href));

  const limitedStages = attackStages.stages.filter(({ flag }) => flag !== 'none');
  const headlineStage = limitedStages[0];

  // Grouped (by gap group, most severe first) and ordered by severity within a group.
  const sortedGaps = useMemo(
    () =>
      [...gaps].sort(
        (a, b) =>
          Object.keys(GROUP_LABEL).indexOf(a.group) - Object.keys(GROUP_LABEL).indexOf(b.group) ||
          SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
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
        fixHref ? (
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
      <SectionTitle index={3} title="Blind spots" subtitle="Where can't I see?" />
      {headlineStage && (
        <>
          <KbnWarningCallout
            title={`${
              headlineStage.flag === 'no_working_detection'
                ? 'No working detection'
                : 'Limited detection coverage'
            } on ${headlineStage.tacticName}, a stage with activity`}
            actionProps={{
              primary: {
                children: 'Review coverage',
                onClick: () => goTo('/app/security/rules_coverage_overview'),
              },
            }}
            data-test-subj="executiveBriefHeadlineGap"
          >
            {`${headlineStage.coverage.effective} of ${headlineStage.coverage.enabled} enabled rules are working and ${headlineStage.observed.alerts} alerts were seen.`}
          </KbnWarningCallout>
          <EuiSpacer size="m" />
        </>
      )}
      <AttackStages summary={attackStages} />
      <EuiSpacer size="l" />
      <EuiBasicTable<BlindSpotGap>
        tableCaption="Other visibility gaps"
        items={sortedGaps}
        columns={columns}
        data-test-subj={TEST_IDS.gapsTable}
      />
      <EuiSpacer size="m" />
      <EuiText size="s" data-test-subj="executiveBriefBlindSpotsSummary">
        <p>{blindSpots.summary}</p>
      </EuiText>
    </section>
  );
};
