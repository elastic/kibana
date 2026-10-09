/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { css } from '@emotion/react';
import { EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import type {
  ExecutiveBrief,
  ExecutiveBriefDecision,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { DecisionAccordion, URGENCY_LABEL } from '../components/decision_accordion';
import { SectionTitle } from '../components/section_title';
import {
  BRIEF_BLOCK_ATTRIBUTE,
  BRIEF_CUT_ATTRIBUTE,
  EXECUTIVE_BRIEF_SECTION_IDS,
} from '../constants';

const URGENCY_ORDER: ReadonlyArray<ExecutiveBriefDecision['urgency']> = [
  'now',
  'this_week',
  'next_review',
];

const CUT = { [BRIEF_CUT_ATTRIBUTE]: '' };

/** Decisions grouped by urgency, so each row only carries the action, owner and what it relates to. */
export const Decisions: React.FC<{ decisions: ExecutiveBrief['decisions'] }> = ({ decisions }) => {
  const { euiTheme } = useEuiTheme();
  const indexed = decisions.map((decision, index) => ({ decision, index }));
  const groups = URGENCY_ORDER.map((urgency) => ({
    urgency,
    items: indexed.filter(({ decision }) => decision.urgency === urgency),
  })).filter(({ items }) => items.length > 0);

  return (
    <section
      id={EXECUTIVE_BRIEF_SECTION_IDS.decisions}
      data-test-subj="executiveBriefDecisions"
      {...{ [BRIEF_BLOCK_ATTRIBUTE]: 'decisions' }}
    >
      <SectionTitle
        index={4}
        title="Decisions and next steps"
        subtitle="Recommended actions, each tied to a threat or blind spot, with an owner and urgency"
      />
      <EuiPanel hasBorder paddingSize="none">
        {groups.map(({ urgency, items }, groupIndex) => (
          <div key={urgency} data-test-subj={`executiveBriefDecisionGroup-${urgency}`}>
            <div
              {...(groupIndex > 0 ? CUT : {})}
              css={css`
                padding: ${euiTheme.size.s} ${euiTheme.size.m} ${euiTheme.size.xs};
                background: ${euiTheme.colors.backgroundBaseSubdued};
                ${groupIndex > 0 ? `border-top: ${euiTheme.border.thin};` : ''}
              `}
            >
              <EuiText size="xs" color="subdued">
                <strong>{URGENCY_LABEL[urgency]}</strong>
              </EuiText>
            </div>
            {items.map(({ decision, index }, itemIndex) => (
              <div key={`${decision.action}-${index}`} {...(itemIndex > 0 ? CUT : {})}>
                <DecisionAccordion decision={decision} index={index} />
              </div>
            ))}
          </div>
        ))}
      </EuiPanel>
    </section>
  );
};
