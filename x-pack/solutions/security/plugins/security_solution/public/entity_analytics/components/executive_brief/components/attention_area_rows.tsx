/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type {
  AttentionArea,
  AttentionAreaId,
  AttentionLevel,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { EXECUTIVE_BRIEF_SECTION_IDS } from '../constants';
import { TEST_IDS } from '../test_ids';
import { useIsPrintMode } from './brief_context';

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

const scrollToSection = (id: string): void => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const AttentionAreaRow: React.FC<{ area: AttentionArea }> = ({ area }) => {
  const { euiTheme } = useEuiTheme();
  const isPrintMode = useIsPrintMode();
  const { color, icon } = STATUS_DISPLAY[area.level];
  const target = AREA_TARGETS[area.id];
  return (
    <div
      key={area.id}
      data-test-subj={TEST_IDS.attentionRow(area.id)}
      role={isPrintMode ? undefined : 'button'}
      tabIndex={isPrintMode ? undefined : 0}
      onClick={isPrintMode ? undefined : () => scrollToSection(target)}
      onKeyDown={
        isPrintMode
          ? undefined
          : (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                scrollToSection(target);
              }
            }
      }
      css={css`
        padding: ${euiTheme.size.s} ${euiTheme.size.m};
        cursor: ${isPrintMode ? 'default' : 'pointer'};
        border-top: ${euiTheme.border.thin};
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
            {AREA_NAMES[area.id]}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={{ width: '6.5em' }}>
          <span>
            <EuiBadge color={color} iconType={icon} data-test-subj="executiveBriefAreaStatus">
              {STATUS_LABELS[area.level]}
            </EuiBadge>
          </span>
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
        {isPrintMode ? null : (
          <EuiFlexItem grow={false} data-test-subj={`executiveBriefAreaWhy-${area.id}`}>
            <EuiIconTip
              type="question"
              size="s"
              aria-label={`Why ${areaFullName(area.id)} is ${STATUS_LABELS[area.level]}`}
              content={area.rule}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </div>
  );
};

export const AttentionAreaRows: React.FC<{ areas: readonly AttentionArea[] }> = ({ areas }) => {
  const { euiTheme } = useEuiTheme();
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
              <AttentionAreaRow key={area.id} area={area} />
            ))}
          </div>
        );
      })}
    </EuiPanel>
  );
};
