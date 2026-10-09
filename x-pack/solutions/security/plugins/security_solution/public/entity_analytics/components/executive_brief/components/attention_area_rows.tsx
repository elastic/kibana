/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
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
  AttentionArea,
  AttentionAreaId,
  AttentionLevel,
  BriefSnapshot,
  ExecutiveBrief,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { useKibana } from '../../../../common/lib/kibana';
import { EXECUTIVE_BRIEF_SECTION_IDS } from '../constants';
import { TEST_IDS } from '../test_ids';
import { buildTriageMessage, buildTriagePrompt } from '../utils/triage_prompts';
import { useIsPrintMode, useRequestStorylineOpen } from './brief_context';

export const AREA_ORDER: readonly AttentionAreaId[] = [
  'threats',
  'response',
  'coverage',
  'visibility',
];

export const AREA_NAMES: Record<AttentionAreaId, string> = {
  threats: 'Threat activity',
  response: 'Response',
  coverage: 'Detection coverage',
  visibility: 'Visibility',
};

/** Rows are grouped under the section they summarise, using the same names as the tabs and headings. */
export const AREA_GROUPS: ReadonlyArray<{
  title: string;
  target: string;
  areas: readonly AttentionAreaId[];
}> = [
  {
    title: 'Priority threats',
    target: EXECUTIVE_BRIEF_SECTION_IDS.storylines,
    areas: ['threats', 'response'],
  },
  {
    title: 'Blind spots',
    target: EXECUTIVE_BRIEF_SECTION_IDS.blindSpots,
    areas: ['coverage', 'visibility'],
  },
];

const AREA_TARGETS = Object.fromEntries(
  AREA_GROUPS.flatMap(({ target, areas }) => areas.map((id) => [id, target]))
) as Record<AttentionAreaId, string>;

const AREA_GROUP_TITLES = Object.fromEntries(
  AREA_GROUPS.flatMap(({ title, areas }) => areas.map((id) => [id, title]))
) as Record<AttentionAreaId, string>;

/** Section and row name, e.g. "Priority threats · Response" (used for exports and labels). */
export const areaFullName = (id: AttentionAreaId): string =>
  `${AREA_GROUP_TITLES[id]} · ${AREA_NAMES[id]}`;

export const STATUS_LABELS: Record<AttentionLevel, string> = {
  urgent: 'Urgent',
  action: 'Action',
  watch: 'Watch',
  clear: 'Clear',
};

const STATUS_DISPLAY: Record<AttentionLevel, { color: string; icon: string }> = {
  urgent: { color: 'danger', icon: 'warning' },
  action: { color: 'warning', icon: 'alert' },
  watch: { color: 'primary', icon: 'eye' },
  clear: { color: 'success', icon: 'checkCircle' },
};

export const sortAreas = (areas: readonly AttentionArea[]): AttentionArea[] =>
  AREA_ORDER.flatMap((id) => areas.filter((area) => area.id === id));

const scrollToElement = (element: HTMLElement | null): void => {
  element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const storylineRankOf = (area: AttentionArea): number => {
  const match = area.evidence.map((id) => /^STORY-(\d+)$/.exec(id)).find(Boolean);
  return match ? Number(match[1]) : 1;
};

export type BriefForTriage = Pick<ExecutiveBrief, 'storylines'>;

interface AttentionActions {
  /** Agent Builder is available; the triage buttons are hidden otherwise. */
  canTriage: boolean;
  triage: (area: AttentionArea) => void;
  /** Jumps to the section behind an area; for threats also expands the storyline card. */
  view: (area: AttentionArea) => void;
}

/** Shared by the verdict and the rows so both act identically. */
export const useAttentionActions = (
  snapshot: BriefSnapshot,
  brief?: BriefForTriage
): AttentionActions => {
  const { agentBuilder } = useKibana().services;
  const requestStorylineOpen = useRequestStorylineOpen();
  const canTriage = Boolean(agentBuilder?.openChat);

  const triage = useCallback(
    (area: AttentionArea) => {
      agentBuilder?.openChat?.({
        autoSendInitialMessage: false,
        newConversation: true,
        initialMessage: buildTriageMessage(buildTriagePrompt(area, snapshot, brief)),
        sessionTag: 'security',
      });
    },
    [agentBuilder, snapshot, brief]
  );

  const view = useCallback(
    (area: AttentionArea) => {
      const section = document.getElementById(AREA_TARGETS[area.id]);
      if (area.id !== 'threats') {
        scrollToElement(section);
        return;
      }
      const rank = storylineRankOf(area);
      requestStorylineOpen(rank);
      scrollToElement(
        document.querySelector<HTMLElement>(
          `[data-test-subj="executiveBriefStorylineCard-${rank}"]`
        ) ?? section
      );
    },
    [requestStorylineOpen]
  );

  return { canTriage, triage, view };
};

const TRIAGE_LABEL = 'Triage with AI Agent';

const ABOVE_ROW_LINK = css`
  position: relative;
  z-index: 1;
`;

interface AttentionAreaRowProps {
  area: AttentionArea;
  actions: AttentionActions;
}

const AttentionAreaRow: React.FC<AttentionAreaRowProps> = ({ area, actions }) => {
  const { euiTheme } = useEuiTheme();
  const isPrintMode = useIsPrintMode();
  const { color, icon } = STATUS_DISPLAY[area.level];
  const showActions = !isPrintMode && area.level !== 'clear';
  const badge = (
    <EuiBadge color={color} iconType={icon} data-test-subj="executiveBriefAreaStatus">
      {STATUS_LABELS[area.level]}
    </EuiBadge>
  );
  const name = AREA_NAMES[area.id];
  return (
    <div
      key={area.id}
      data-test-subj={TEST_IDS.attentionRow(area.id)}
      css={css`
        position: relative;
        padding: ${euiTheme.size.s} ${euiTheme.size.m};
        border-top: ${euiTheme.border.thin};
        ${isPrintMode
          ? ''
          : `
        transition: background ${euiTheme.animation.fast} ease-in;
        &:hover {
          background: ${euiTheme.colors.backgroundBaseInteractiveHover};
        }`}
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
            {isPrintMode ? (
              name
            ) : (
              // The name is the row's link; its ::after stretches the click target over the whole row.
              <EuiLink
                color="text"
                onClick={() => actions.view(area)}
                aria-label={`View ${areaFullName(area.id)}`}
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
            )}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={{ width: '6.5em' }}>
          {isPrintMode ? (
            <span>{badge}</span>
          ) : (
            <EuiToolTip content={area.rule}>
              <span
                tabIndex={0}
                data-test-subj={`executiveBriefAreaPill-${area.id}`}
                css={ABOVE_ROW_LINK}
              >
                {badge}
              </span>
            </EuiToolTip>
          )}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s" data-test-subj="executiveBriefAreaSummary">
            {area.summary}
          </EuiText>
          {isPrintMode ? (
            <EuiText size="xs" color="subdued" data-test-subj="executiveBriefAreaRulePrint">
              {area.rule}
            </EuiText>
          ) : null}
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
              {actions.canTriage ? (
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={TRIAGE_LABEL} disableScreenReaderOutput>
                    <EuiButtonIcon
                      size="xs"
                      iconType="sparkles"
                      color="text"
                      aria-label={`${TRIAGE_LABEL}: ${AREA_NAMES[area.id]}`}
                      onClick={() => actions.triage(area)}
                      data-test-subj={`executiveBriefAreaTriage-${area.id}`}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>
                <EuiToolTip content="View details" disableScreenReaderOutput>
                  <EuiButtonIcon
                    size="xs"
                    iconType="chevronSingleRight"
                    color="text"
                    onClick={() => actions.view(area)}
                    aria-label={`View ${areaFullName(area.id)}`}
                    data-test-subj={`executiveBriefAreaView-${area.id}`}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </div>
  );
};

interface AttentionAreaRowsProps {
  areas: readonly AttentionArea[];
  snapshot: BriefSnapshot;
  brief?: BriefForTriage;
}

export const AttentionAreaRows: React.FC<AttentionAreaRowsProps> = ({ areas, snapshot, brief }) => {
  const { euiTheme } = useEuiTheme();
  const actions = useAttentionActions(snapshot, brief);
  return (
    <EuiPanel hasBorder paddingSize="none" data-test-subj="executiveBriefAttentionRows">
      {AREA_GROUPS.map((group, groupIndex) => {
        const groupAreas = sortAreas(areas).filter((area) => group.areas.includes(area.id));
        if (groupAreas.length === 0) return null;
        return (
          <div key={group.title} data-test-subj={`executiveBriefAttentionGroup-${group.target}`}>
            <div
              css={css`
                padding: ${euiTheme.size.s} ${euiTheme.size.m} ${euiTheme.size.xs};
                background: ${euiTheme.colors.backgroundBaseSubdued};
                ${groupIndex > 0 ? `border-top: ${euiTheme.border.thin};` : ''}
              `}
            >
              <EuiText size="xs" color="subdued">
                <strong>{group.title}</strong>
              </EuiText>
            </div>
            {groupAreas.map((area) => (
              <AttentionAreaRow key={area.id} area={area} actions={actions} />
            ))}
          </div>
        );
      })}
    </EuiPanel>
  );
};
