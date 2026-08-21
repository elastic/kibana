/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import type { Investigation } from '@kbn/pnd-common';
import { type DecisionState, decisionStateColor, decisionStateLabel } from '../../../theme';
import * as i18n from '../translations';

/**
 * Map an investigation `status` string onto one of the four Throughline
 * decision-states. The prototype's Decision Radar groups the analyst's queue by
 * *where the decision is*, not by recommended action:
 *   - waiting   → a human still owes a decision (open / needs triage / proposal pending)
 *   - in_motion → an agent (Dark/Deep Watch) is actively working it
 *   - deferred  → snoozed / parked for later
 *   - decided   → resolved (contained / escalated-out / auto-resolved / closed)
 */
export const decisionStateForStatus = (status: string | undefined): DecisionState => {
  switch (status) {
    case 'in-progress':
    case 'investigating':
      return 'in_motion';
    case 'deferred':
    case 'snoozed':
      return 'deferred';
    case 'auto-resolved':
    case 'closed':
    case 'contained':
    case 'dismissed':
      return 'decided';
    case 'open':
    case 'escalated':
    case 'deep-watch-complete':
    default:
      // Anything the human still owns (incl. Deep-Watch-complete awaiting the
      // containment decision) is "waiting".
      return 'waiting';
  }
};

const ORDER: DecisionState[] = ['waiting', 'in_motion', 'deferred', 'decided'];

export interface DecisionRadarProps {
  investigations: Investigation[];
  /** Currently-selected decision-state filter (null = no filter). */
  selected: DecisionState | null;
  onSelect: (state: DecisionState | null) => void;
}

/**
 * G6.B — Decision Radar. A compact strip of four selectable stat cards, one per
 * decision-state, tinted with the Throughline decision-state tokens
 * (theme-aware — no inline hex). Clicking a card toggles a filter on the Brief.
 */
export const DecisionRadar: React.FC<DecisionRadarProps> = ({
  investigations,
  selected,
  onSelect,
}) => {
  const { euiTheme } = useEuiTheme();

  const counts = useMemo(() => {
    const acc: Record<DecisionState, number> = {
      waiting: 0,
      in_motion: 0,
      deferred: 0,
      decided: 0,
    };
    for (const investigation of investigations) {
      acc[decisionStateForStatus(investigation.status)] += 1;
    }
    return acc;
  }, [investigations]);

  return (
    <EuiFlexGroup
      gutterSize="s"
      responsive={false}
      wrap
      data-test-subj="pndDecisionRadar"
      aria-label={i18n.DECISION_RADAR.ARIA}
    >
      {ORDER.map((state) => {
        const accent = decisionStateColor(euiTheme, state);
        const isSelected = selected === state;
        return (
          <EuiFlexItem key={state} grow={1}>
            <EuiPanel
              paddingSize="m"
              hasBorder
              hasShadow={false}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              data-test-subj={`pndDecisionRadarCard-${state}`}
              onClick={() => onSelect(isSelected ? null : state)}
              onKeyDown={(event: React.KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(isSelected ? null : state);
                }
              }}
              css={css`
                cursor: pointer;
                border-left: ${euiTheme.border.width.thick} solid ${accent};
                ${isSelected
                  ? `outline: ${euiTheme.border.width.thin} solid ${accent}; background-color: ${euiTheme.colors.backgroundBaseSubdued};`
                  : ''}
              `}
            >
              <EuiTitle size="m">
                <span
                  css={css`
                    color: ${accent};
                  `}
                >
                  {counts[state]}
                </span>
              </EuiTitle>
              <EuiText size="xs" color="subdued">
                {decisionStateLabel[state]}
              </EuiText>
            </EuiPanel>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
