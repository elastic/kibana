/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiHealth, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { Brief } from '../../../../../../common/entity_analytics/executive_brief/brief';
import type { Evidence } from '../../../../../../common/entity_analytics/executive_brief/evidence';
import { ActionRow } from './action_row';
import { URGENCY_COLOR, URGENCY_LABEL, URGENCY_ORDER } from './labels';

const NO_ACTIONS_TITLE = 'No recommended actions';

interface RecommendedActionsProps {
  brief: Brief;
  evidence: Evidence;
}

/** Recommended actions grouped by urgency; each row carries the action, owner and threat. */
export const RecommendedActions: React.FC<RecommendedActionsProps> = ({ brief, evidence }) => {
  const { euiTheme } = useEuiTheme();
  const indexed = brief.actions.map((action, index) => ({ action, index }));
  const groups = URGENCY_ORDER.map((urgency) => ({
    urgency,
    items: indexed.filter(({ action }) => action.urgency === urgency),
  })).filter(({ items }) => items.length > 0);

  if (groups.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="checkInCircleFilled"
        titleSize="xs"
        title={<h4>{NO_ACTIONS_TITLE}</h4>}
        data-test-subj="executiveBriefActionsEmpty"
      />
    );
  }

  return (
    <EuiPanel hasBorder paddingSize="none" data-test-subj="executiveBriefActions">
      {groups.map(({ urgency, items }, groupIndex) => (
        <div key={urgency} data-test-subj={`executiveBriefActionGroup-${urgency}`}>
          <div
            css={css`
              padding: ${euiTheme.size.s} ${euiTheme.size.m} ${euiTheme.size.xs};
              background: ${euiTheme.colors.backgroundBaseSubdued};
              ${groupIndex > 0 ? `border-top: ${euiTheme.border.thin};` : ''}
            `}
          >
            <EuiHealth
              color={URGENCY_COLOR[urgency]}
              textSize="xs"
              data-test-subj={`executiveBriefActionGroupTitle-${urgency}`}
            >
              <EuiText size="xs">
                <strong>{URGENCY_LABEL[urgency]}</strong>
              </EuiText>
            </EuiHealth>
          </div>
          {items.map(({ action, index }) => (
            <ActionRow
              key={`${action.action}-${index}`}
              action={action}
              index={index}
              brief={brief}
              evidence={evidence}
            />
          ))}
        </div>
      ))}
    </EuiPanel>
  );
};
