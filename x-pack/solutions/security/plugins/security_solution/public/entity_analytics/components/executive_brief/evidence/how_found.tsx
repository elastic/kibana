/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import type { BriefThreat } from '../../../../../common/entity_analytics/executive_brief/brief';
import type { Evidence } from '../../../../../common/entity_analytics/executive_brief/evidence';
import { CAPABILITY_ICON, CAPABILITY_LABEL } from './constants';
import { getHowFoundCapabilities } from './resolve';

const HOW_FOUND_TITLE = 'How it was found';

interface HowFoundProps {
  threat: BriefThreat;
  evidence: Evidence;
}

/** Chips naming the Entity Analytics capabilities behind a threat. */
export const HowFound: React.FC<HowFoundProps> = ({ threat, evidence }) => {
  const capabilities = getHowFoundCapabilities(threat, evidence);
  if (capabilities.length === 0) return null;

  return (
    <div data-test-subj="executiveBriefHowFound">
      <EuiTitle size="xxs">
        <h5>{HOW_FOUND_TITLE}</h5>
      </EuiTitle>
      <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
        {capabilities.map((capability) => (
          <EuiFlexItem grow={false} key={capability}>
            <EuiBadge
              color="hollow"
              iconType={CAPABILITY_ICON[capability]}
              data-test-subj={`executiveBriefHowFound-${capability}`}
            >
              {CAPABILITY_LABEL[capability]}
            </EuiBadge>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </div>
  );
};
