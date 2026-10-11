/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import type {
  BriefSnapshot,
  ExecutiveBrief,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { AttentionAreaRows } from '../components/attention_area_rows';
import { AttentionTrend, AttentionVerdict } from '../components/attention_verdict';
import { ClaimFlag } from '../components/brief_context';
import { SectionTitle } from '../components/section_title';
import { BRIEF_BLOCK_ATTRIBUTE, EXECUTIVE_BRIEF_SECTION_IDS } from '../constants';

interface AtAGlanceProps {
  snapshot: BriefSnapshot;
  glance: ExecutiveBrief['glance'];
  /** Optional: lets triage prompts use the generated storyline titles. */
  brief?: Pick<ExecutiveBrief, 'storylines'>;
}

export const AtAGlance: React.FC<AtAGlanceProps> = ({ snapshot, glance, brief }) => {
  const { assessment } = snapshot.glance;
  return (
    <section
      id={EXECUTIVE_BRIEF_SECTION_IDS.atAGlance}
      data-test-subj="executiveBriefAtAGlance"
      {...{ [BRIEF_BLOCK_ATTRIBUTE]: 'glance' }}
    >
      <SectionTitle
        index={1}
        title="At a glance"
        subtitle="Overall attention needed, based on active threats, response, detection coverage and visibility"
      />
      <AttentionVerdict assessment={assessment} snapshot={snapshot} brief={brief}>
        <EuiSpacer size="s" />
        <EuiText size="s" data-test-subj="executiveBriefThreatNarrative">
          <p>
            {glance.headline} <ClaimFlag claimPath="glance.headline" />
          </p>
        </EuiText>
      </AttentionVerdict>
      {assessment ? (
        <>
          <EuiSpacer size="m" />
          <AttentionAreaRows areas={assessment.areas} snapshot={snapshot} brief={brief} />
        </>
      ) : null}
      <EuiSpacer size="m" />
      <AttentionTrend snapshot={snapshot} />
      <EuiSpacer size="m" />
      <EuiText size="s" data-test-subj="executiveBriefNarrative">
        <p>
          {glance.threatNarrative} <ClaimFlag claimPath="glance.threatNarrative" />
        </p>
      </EuiText>
    </section>
  );
};
