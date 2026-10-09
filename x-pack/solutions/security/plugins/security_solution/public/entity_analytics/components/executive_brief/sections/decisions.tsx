/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiPanel } from '@elastic/eui';
import type { ExecutiveBrief } from '../../../../../common/entity_analytics/executive_brief/types';
import { DecisionAccordion } from '../components/decision_accordion';
import { SectionTitle } from '../components/section_title';
import { BRIEF_BLOCK_ATTRIBUTE, EXECUTIVE_BRIEF_SECTION_IDS } from '../constants';

export const Decisions: React.FC<{ decisions: ExecutiveBrief['decisions'] }> = ({ decisions }) => (
  <section
    id={EXECUTIVE_BRIEF_SECTION_IDS.decisions}
    data-test-subj="executiveBriefDecisions"
    {...{ [BRIEF_BLOCK_ATTRIBUTE]: 'decisions' }}
  >
    <SectionTitle index={4} title="Decisions and next steps" subtitle="What should we do?" />
    <EuiPanel hasBorder paddingSize="m">
      {decisions.map((decision, index) => (
        <DecisionAccordion
          key={`${decision.action}-${index}`}
          decision={decision}
          index={index}
          initialIsOpen={index === 0}
        />
      ))}
    </EuiPanel>
  </section>
);
