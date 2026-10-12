/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import type { Brief } from '../../../../../../common/entity_analytics/executive_brief/brief';
import type { Evidence } from '../../../../../../common/entity_analytics/executive_brief/evidence';
import { ThreatCard } from './threat_card';

const NO_THREATS_TITLE = 'No priority threats';
const NO_THREATS_BODY =
  'No threats that need attention were found in the evidence gathered for this brief.';

interface PriorityThreatsProps {
  brief: Brief;
  evidence: Evidence;
}

/** The brief's priority threat cards, ranked in the order the brief lists them. */
export const PriorityThreats: React.FC<PriorityThreatsProps> = ({ brief, evidence }) => {
  if (brief.threats.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="checkInCircleFilled"
        titleSize="xs"
        title={<h4>{NO_THREATS_TITLE}</h4>}
        body={<p>{NO_THREATS_BODY}</p>}
        data-test-subj="executiveBriefThreatsEmpty"
      />
    );
  }

  return (
    <div data-test-subj="executiveBriefThreats">
      {brief.threats.map((threat, index) => (
        <React.Fragment key={`${threat.title}-${index}`}>
          {index > 0 && <EuiSpacer size="m" />}
          <ThreatCard threat={threat} rank={index + 1} brief={brief} evidence={evidence} />
        </React.Fragment>
      ))}
    </div>
  );
};
