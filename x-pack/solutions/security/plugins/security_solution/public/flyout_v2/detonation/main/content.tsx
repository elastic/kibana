/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiCallOut,
  EuiCode,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { ExpandableSection } from '../../shared/components/expandable_section';
import { AiSummary } from './ai_summary';
import { HighlightedFields } from './highlighted_fields';
import type { ActivityAction, ActivityKind, NetworkFlag, Severity } from '../report_data';
import {
  ACTIVITY_COUNTS,
  ACTIVITY_ROWS,
  FILE_CONTEXT_ROWS,
  NETWORK_ROWS,
  RELATED_FILES,
  REPORT,
  SURICATA_MATCHES,
  VERDICT_REASONS,
  YARA_MATCHES,
} from '../report_data';
import * as i18n from '../translations';

export const DETONATION_CONTENT_TEST_ID = 'detonationReportContent';

const SEVERITY_COLOR: Record<Severity, string> = { High: 'danger', Med: 'warning' };
const FLAG_COLOR: Record<NetworkFlag, string> = {
  C2: 'danger',
  Recon: 'warning',
  Benign: 'default',
};
const ACTION_COLOR: Record<ActivityAction, string> = {
  Dropped: 'danger',
  Written: 'warning',
  Modified: 'warning',
  Created: 'default',
  Deleted: 'default',
  Started: 'default',
};

const CountBadge = ({ count }: { count: number }) => <EuiBadge color="hollow">{count}</EuiBadge>;

interface SectionProps {
  title: string;
  /** Optional element shown after the title, e.g. a count. */
  badge?: React.ReactNode;
  expanded: boolean;
  children: React.ReactNode;
  ['data-test-subj']: string;
}

/**
 * Collapsible report section, styled like the plain accordion sections of the alert flyout
 * (chevron and bold title, no panel), with a rule underneath.
 */
const Section = ({
  title,
  badge,
  expanded,
  children,
  'data-test-subj': dataTestSubj,
}: SectionProps) => (
  <>
    <ExpandableSection
      data-test-subj={dataTestSubj}
      expanded={expanded}
      gutterSize="s"
      title={
        <>
          {title}
          {badge ? <> {badge}</> : null}
        </>
      }
    >
      {children}
    </ExpandableSection>
    <EuiHorizontalRule margin="m" />
  </>
);

const Eyebrow = ({ children }: { children: string }) => (
  <EuiTitle size="xxxs">
    <h4>{children.toUpperCase()}</h4>
  </EuiTitle>
);

const ScoreRing = memo(({ score }: { score: number }) => {
  const { euiTheme } = useEuiTheme();
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg width={96} height={96} viewBox="0 0 96 96" role="img" aria-label={`${score} / 100`}>
      <circle
        cx={48}
        cy={48}
        r={radius}
        fill="none"
        stroke={euiTheme.colors.borderBaseDanger}
        strokeWidth={8}
      />
      <circle
        cx={48}
        cy={48}
        r={radius}
        fill="none"
        stroke={euiTheme.colors.textDanger}
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={`${(score / 100) * circumference} ${circumference}`}
        transform="rotate(-90 48 48)"
      />
      <text
        x={48}
        y={58}
        textAnchor="middle"
        fontSize={30}
        fontWeight={euiTheme.font.weight.bold}
        fill={euiTheme.colors.textDanger}
      >
        {score}
      </text>
    </svg>
  );
});
ScoreRing.displayName = 'ScoreRing';

const VerdictPanel = memo(() => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel color="danger" hasBorder paddingSize="m" data-test-subj="detonationVerdictPanel">
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <ScoreRing score={REPORT.score} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3 css={{ color: euiTheme.colors.textDanger }}>{i18n.MALICIOUS}</h3>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            {i18n.THREAT_SCORE_LABEL}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <Eyebrow>{i18n.WHY_THIS_VERDICT}</Eyebrow>
      {VERDICT_REASONS.map((reason) => (
        <React.Fragment key={reason.title}>
          <EuiHorizontalRule margin="s" />
          <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
            <EuiFlexItem grow={false} css={{ width: 48 }}>
              <span>
                <EuiBadge color={SEVERITY_COLOR[reason.severity]}>{reason.severity}</EuiBadge>
              </span>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">{reason.title}</EuiText>
              {reason.detail && (
                <EuiText size="xs" color="subdued">
                  {reason.detail}
                </EuiText>
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="danger">
                <strong>{`+${reason.points}`}</strong>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </React.Fragment>
      ))}
    </EuiPanel>
  );
});
VerdictPanel.displayName = 'VerdictPanel';

const NetworkActivity = memo(() => {
  const columns: Array<EuiBasicTableColumn<(typeof NETWORK_ROWS)[number]>> = [
    {
      field: 'host',
      name: i18n.DOMAIN_OR_IP,
      render: (host: string, row) => (
        <div>
          <EuiText
            size="s"
            color={row.isMalicious ? 'danger' : 'default'}
            css={{ wordBreak: 'break-all' }}
          >
            {row.isMalicious ? <strong>{host}</strong> : host}
          </EuiText>
          <EuiText size="xs" color="subdued" css={{ wordBreak: 'break-all' }}>
            {row.detail}
          </EuiText>
        </div>
      ),
    },
    { field: 'port', name: i18n.PORT, width: '70px' },
    {
      field: 'flag',
      name: i18n.FLAG,
      width: '90px',
      render: (flag: NetworkFlag) => <EuiBadge color={FLAG_COLOR[flag]}>{flag}</EuiBadge>,
    },
  ];
  return (
    <Section
      title={i18n.NETWORK_ACTIVITY}
      badge={<CountBadge count={NETWORK_ROWS.length} />}
      expanded={false}
      data-test-subj="detonationNetworkActivity"
    >
      <EuiBasicTable
        tableCaption={i18n.NETWORK_ACTIVITY}
        items={NETWORK_ROWS}
        columns={columns}
        itemId="id"
      />
    </Section>
  );
});
NetworkActivity.displayName = 'NetworkActivity';

const FileAndSystemActivity = memo(() => {
  const [selectedTab, setSelectedTab] = useState<ActivityKind | 'all'>('files');
  const tabs: Array<{ id: ActivityKind | 'all'; label: string; count: number }> = [
    { id: 'files', label: i18n.TAB_FILES, count: ACTIVITY_COUNTS.files },
    { id: 'processes', label: i18n.TAB_PROCESSES, count: ACTIVITY_COUNTS.processes },
    { id: 'registry', label: i18n.TAB_REGISTRY, count: ACTIVITY_COUNTS.registry },
    { id: 'all', label: i18n.TAB_ALL, count: ACTIVITY_COUNTS.all },
  ];
  const items = useMemo(
    () =>
      selectedTab === 'all'
        ? ACTIVITY_ROWS
        : ACTIVITY_ROWS.filter((row) => row.kind === selectedTab),
    [selectedTab]
  );
  const columns: Array<EuiBasicTableColumn<(typeof ACTIVITY_ROWS)[number]>> = [
    {
      field: 'action',
      name: i18n.ACTION,
      width: '100px',
      render: (action: ActivityAction) => (
        <EuiBadge color={ACTION_COLOR[action]}>{action}</EuiBadge>
      ),
    },
    {
      field: 'path',
      name: i18n.PATH,
      render: (path: string) => <EuiCode transparentBackground>{path}</EuiCode>,
    },
  ];
  return (
    <Section
      title={i18n.FILE_AND_SYSTEM_ACTIVITY}
      badge={<CountBadge count={ACTIVITY_COUNTS.all} />}
      expanded={false}
      data-test-subj="detonationFileAndSystemActivity"
    >
      <EuiTabs size="s" bottomBorder={false}>
        {tabs.map((tab) => (
          <EuiTab
            key={tab.id}
            isSelected={tab.id === selectedTab}
            onClick={() => setSelectedTab(tab.id)}
          >
            {`${tab.label} (${tab.count})`}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="s" />
      <EuiBasicTable
        tableCaption={i18n.FILE_AND_SYSTEM_ACTIVITY}
        items={items}
        columns={columns}
        itemId="id"
      />
    </Section>
  );
});
FileAndSystemActivity.displayName = 'FileAndSystemActivity';

const SuricataAndYara = memo(() => (
  <Section
    title={i18n.SURICATA_AND_YARA}
    badge={<CountBadge count={SURICATA_MATCHES.length + YARA_MATCHES.length} />}
    expanded={true}
    data-test-subj="detonationSuricataAndYara"
  >
    <Eyebrow>{`${i18n.SURICATA} (${SURICATA_MATCHES.length})`}</Eyebrow>
    <EuiSpacer size="s" />
    {SURICATA_MATCHES.map((match) => (
      <div key={match.id}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge color={SEVERITY_COLOR[match.severity]}>{match.severity}</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiCode transparentBackground>{match.sid}</EuiCode>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiText size="s">{match.name}</EuiText>
        <EuiText size="xs" color="subdued">{`→ ${match.target}`}</EuiText>
      </div>
    ))}
    <EuiHorizontalRule margin="s" />
    <Eyebrow>{`${i18n.YARA} (${YARA_MATCHES.length})`}</Eyebrow>
    <EuiSpacer size="s" />
    {YARA_MATCHES.map((match, index) => (
      <div key={match.id}>
        {index > 0 && <EuiSpacer size="s" />}
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge color={SEVERITY_COLOR[match.severity]}>{match.severity}</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiCode transparentBackground>{match.rule}</EuiCode>
          </EuiFlexItem>
          {match.tag && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="primary">{match.tag}</EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiText size="xs" color="subdued">
          {match.detail}
        </EuiText>
      </div>
    ))}
  </Section>
));
SuricataAndYara.displayName = 'SuricataAndYara';

const FileContext = memo(() => {
  const columns: Array<EuiBasicTableColumn<(typeof RELATED_FILES)[number]>> = [
    {
      field: 'name',
      name: i18n.FILE,
      render: (name: string) => <EuiLink>{name}</EuiLink>,
    },
    { field: 'relation', name: i18n.RELATION },
    {
      field: 'verdict',
      name: i18n.VERDICT,
      render: (verdict: 'Malicious' | 'Suspicious') => (
        <EuiBadge color={verdict === 'Malicious' ? 'danger' : 'warning'}>{verdict}</EuiBadge>
      ),
    },
  ];
  return (
    <Section title={i18n.FILE_CONTEXT} expanded={true} data-test-subj="detonationFileContext">
      <EuiCallOut
        size="s"
        color="warning"
        iconType="warning"
        title={`${i18n.FILE_CONTEXT_CALLOUT_TITLE} — ${i18n.FILE_CONTEXT_CALLOUT_TEXT}`}
      />
      <EuiSpacer size="m" />
      <EuiDescriptionList
        type="column"
        compressed
        columnWidths={[1, 2]}
        listItems={FILE_CONTEXT_ROWS.map(([title, description]) => ({ title, description }))}
      />
      <EuiSpacer size="m" />
      <Eyebrow>{`${i18n.RELATED_FILES} (${RELATED_FILES.length})`}</Eyebrow>
      <EuiSpacer size="s" />
      <EuiBasicTable
        tableCaption={i18n.RELATED_FILES}
        items={RELATED_FILES}
        columns={columns}
        itemId="id"
      />
    </Section>
  );
});
FileContext.displayName = 'FileContext';

const Enrichment = memo(() => (
  <Section
    title={i18n.ENRICHMENT}
    badge={<EuiBadge color="hollow">{i18n.OPTIONAL}</EuiBadge>}
    expanded={false}
    data-test-subj="detonationEnrichment"
  >
    <EuiText size="s" color="subdued">
      {'—'}
    </EuiText>
  </Section>
));
Enrichment.displayName = 'Enrichment';

/**
 * Body of the detonation report flyout.
 */
export const Content = memo(() => (
  <EuiFlexGroup
    direction="column"
    gutterSize="m"
    responsive={false}
    data-test-subj={DETONATION_CONTENT_TEST_ID}
  >
    <EuiFlexItem>
      <AiSummary />
    </EuiFlexItem>
    <EuiFlexItem>
      <VerdictPanel />
    </EuiFlexItem>
    <EuiFlexItem>
      <HighlightedFields />
    </EuiFlexItem>
    <EuiFlexItem>
      <NetworkActivity />
    </EuiFlexItem>
    <EuiFlexItem>
      <FileAndSystemActivity />
    </EuiFlexItem>
    <EuiFlexItem>
      <SuricataAndYara />
    </EuiFlexItem>
    <EuiFlexItem>
      <FileContext />
    </EuiFlexItem>
    <EuiFlexItem>
      <Enrichment />
    </EuiFlexItem>
  </EuiFlexGroup>
));

Content.displayName = 'Content';
