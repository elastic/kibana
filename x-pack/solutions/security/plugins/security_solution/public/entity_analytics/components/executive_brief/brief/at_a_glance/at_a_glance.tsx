/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import type { Brief } from '../../../../../../common/entity_analytics/executive_brief/brief';
import type { Evidence } from '../../../../../../common/entity_analytics/executive_brief/evidence';
import { EXECUTIVE_BRIEF_TEST_IDS } from '../../constants';
import { AttentionAreaRows } from './attention_area_rows';
import { AttentionVerdict } from './attention_verdict';
import type { TriagePeriod } from './triage_requests';

interface AtAGlanceProps {
  brief: Brief;
  evidence: Evidence;
  /** Time window of the brief; added to triage prompts. */
  period?: TriagePeriod;
}

/** The verdict and the area rows. Renders from the brief only; actions come from the actions context. */
export const AtAGlance: React.FC<AtAGlanceProps> = ({ brief, evidence, period }) => (
  <div data-test-subj={EXECUTIVE_BRIEF_TEST_IDS.atAGlance}>
    <AttentionVerdict brief={brief} evidence={evidence} period={period} />
    {brief.areas.length > 0 ? (
      <>
        <EuiSpacer size="m" />
        <AttentionAreaRows brief={brief} evidence={evidence} period={period} />
      </>
    ) : null}
  </div>
);
