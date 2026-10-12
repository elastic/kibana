/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type {
  AreaId,
  AttentionLevel,
  Brief,
  BriefArea,
} from '../../../../../../common/entity_analytics/executive_brief/brief';
import { AREA_IDS } from '../../../../../../common/entity_analytics/executive_brief/brief';
import type { Evidence } from '../../../../../../common/entity_analytics/executive_brief/evidence';
import { useBriefActions } from '../../actions/brief_actions_context';
import { AREA_LABELS, EXECUTIVE_BRIEF_TEST_IDS } from '../../constants';
import type { TriagePeriod } from './triage_requests';
import { buildAreaTriageRequest } from './triage_requests';

/** Rows are grouped under the section they summarise, using the same name as its heading. */
export const AREA_GROUP_TITLE = 'Priority threats';

const STATUS_LABELS: Record<AttentionLevel, string> = {
  urgent: 'Urgent',
  action: 'Action',
  watch: 'Watch',
  clear: 'Clear',
};

const STATUS_RULES: Record<AttentionLevel, string> = {
  urgent: 'Urgent: needs attention now.',
  action: 'Action: needs a decision or an owner.',
  watch: 'Watch: worth monitoring, no action needed yet.',
  clear: 'Clear: nothing needs attention.',
};

const STATUS_DISPLAY: Record<AttentionLevel, { color: string; icon: string }> = {
  urgent: { color: 'danger', icon: 'warning' },
  action: { color: 'warning', icon: 'alert' },
  watch: { color: 'primary', icon: 'eye' },
  clear: { color: 'success', icon: 'checkCircle' },
};

const TRIAGE_LABEL = 'Triage with AI Agent';
const VIEW_LABEL = 'View details';

const sortAreas = (areas: readonly BriefArea[]): BriefArea[] =>
  AREA_IDS.flatMap((id) => areas.filter((area) => area.id === id));

/** The threat an area row points at: the top threat, or for Response the first one without a response. */
export const getAreaThreatRank = (areaId: AreaId, brief: Brief): number | undefined => {
  if (brief.threats.length === 0) return undefined;
  if (areaId === 'response') {
    const index = brief.threats.findIndex(({ status }) => status === 'unaddressed');
    return index === -1 ? 1 : index + 1;
  }
  return 1;
};

const ABOVE_ROW_LINK = css`
  position: relative;
  z-index: 1;
`;

interface AttentionAreaRowProps {
  area: BriefArea;
  brief: Brief;
  evidence: Evidence;
  period?: TriagePeriod;
}

const AttentionAreaRow: React.FC<AttentionAreaRowProps> = ({ area, brief, evidence, period }) => {
  const { euiTheme } = useEuiTheme();
  const actions = useBriefActions();
  const { color, icon } = STATUS_DISPLAY[area.level];
  const name = AREA_LABELS[area.id];
  const threatRank = getAreaThreatRank(area.id, brief);
  const openThreat = actions && threatRank !== undefined ? actions.openThreat : undefined;
  const view = openThreat && threatRank !== undefined ? () => openThreat(threatRank) : undefined;
  const triage = actions?.triage;
  const showActions = area.level !== 'clear' && Boolean(view || triage);

  return (
    <div
      data-test-subj={`executiveBriefAreaRow-${area.id}`}
      css={css`
        position: relative;
        padding: ${euiTheme.size.s} ${euiTheme.size.m};
        border-top: ${euiTheme.border.thin};
        transition: background ${euiTheme.animation.fast} ease-in;
        &:hover {
          background: ${euiTheme.colors.backgroundBaseInteractiveHover};
        }
        &:hover .executiveBriefRowActions {
          opacity: 1;
        }
      `}
    >
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false} css={{ width: '10.5em' }}>
          <EuiText
            size="s"
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
          >
            {view ? (
              // The name is the row's link; its ::after stretches the click target over the whole row.
              <EuiLink
                color="text"
                onClick={view}
                aria-label={`${VIEW_LABEL}: ${name}`}
                data-test-subj={`executiveBriefAreaLink-${area.id}`}
                css={css`
                  font-weight: inherit;
                  &::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                  }
                `}
              >
                {name}
              </EuiLink>
            ) : (
              name
            )}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={{ width: '6.5em' }}>
          <EuiToolTip content={STATUS_RULES[area.level]}>
            <span
              tabIndex={0}
              data-test-subj={`executiveBriefAreaPill-${area.id}`}
              css={ABOVE_ROW_LINK}
            >
              <EuiBadge color={color} iconType={icon}>
                {STATUS_LABELS[area.level]}
              </EuiBadge>
            </span>
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s" data-test-subj={`executiveBriefAreaSummary-${area.id}`}>
            {area.summary}
          </EuiText>
        </EuiFlexItem>
        {showActions ? (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              gutterSize="xs"
              alignItems="center"
              responsive={false}
              css={[
                ABOVE_ROW_LINK,
                css`
                  opacity: 0.55;
                  transition: opacity ${euiTheme.animation.fast} ease-in;
                  &:focus-within {
                    opacity: 1;
                  }
                `,
              ]}
              className="executiveBriefRowActions"
            >
              {triage ? (
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={TRIAGE_LABEL} disableScreenReaderOutput>
                    <EuiButtonIcon
                      size="xs"
                      iconType="sparkles"
                      color="text"
                      aria-label={`${TRIAGE_LABEL}: ${name}`}
                      onClick={() => triage(buildAreaTriageRequest(area, brief, evidence, period))}
                      data-test-subj={`executiveBriefAreaTriage-${area.id}`}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              ) : null}
              {view ? (
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={VIEW_LABEL} disableScreenReaderOutput>
                    <EuiButtonIcon
                      size="xs"
                      iconType="chevronSingleRight"
                      color="text"
                      onClick={view}
                      aria-label={`${VIEW_LABEL}: ${name}`}
                      data-test-subj={`executiveBriefAreaView-${area.id}`}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </div>
  );
};

interface AttentionAreaRowsProps {
  brief: Brief;
  evidence: Evidence;
  period?: TriagePeriod;
}

export const AttentionAreaRows: React.FC<AttentionAreaRowsProps> = ({
  brief,
  evidence,
  period,
}) => {
  const { euiTheme } = useEuiTheme();
  const areas = sortAreas(brief.areas);
  if (areas.length === 0) return null;
  return (
    <EuiPanel hasBorder paddingSize="none" data-test-subj={EXECUTIVE_BRIEF_TEST_IDS.areaRows}>
      <div
        css={css`
          padding: ${euiTheme.size.s} ${euiTheme.size.m} ${euiTheme.size.xs};
          background: ${euiTheme.colors.backgroundBaseSubdued};
        `}
      >
        <EuiText size="xs" color="subdued">
          <strong>{AREA_GROUP_TITLE}</strong>
        </EuiText>
      </div>
      {areas.map((area) => (
        <AttentionAreaRow
          key={area.id}
          area={area}
          brief={brief}
          evidence={evidence}
          period={period}
        />
      ))}
    </EuiPanel>
  );
};
