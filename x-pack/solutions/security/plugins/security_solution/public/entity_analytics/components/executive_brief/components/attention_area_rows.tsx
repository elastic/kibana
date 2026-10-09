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
  threats: 'Active threats',
  response: 'Response',
  coverage: 'Detection coverage',
  visibility: 'Visibility',
};

const AREA_TARGETS: Record<AttentionAreaId, string> = {
  threats: EXECUTIVE_BRIEF_SECTION_IDS.storylines,
  response: EXECUTIVE_BRIEF_SECTION_IDS.storylines,
  coverage: EXECUTIVE_BRIEF_SECTION_IDS.blindSpots,
  visibility: EXECUTIVE_BRIEF_SECTION_IDS.blindSpots,
};

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

export const AttentionAreaRows: React.FC<{ areas: readonly AttentionArea[] }> = ({ areas }) => {
  const { euiTheme } = useEuiTheme();
  const isPrintMode = useIsPrintMode();
  return (
    <EuiPanel hasBorder paddingSize="none" data-test-subj="executiveBriefAttentionRows">
      {sortAreas(areas).map((area, index) => {
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
              ${index > 0 ? `border-top: ${euiTheme.border.thin};` : ''}
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
                    aria-label={`Why ${AREA_NAMES[area.id]} is ${STATUS_LABELS[area.level]}`}
                    content={area.rule}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </div>
        );
      })}
    </EuiPanel>
  );
};
