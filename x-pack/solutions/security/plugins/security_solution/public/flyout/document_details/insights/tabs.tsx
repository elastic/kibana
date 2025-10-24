/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  INSIGHTS_TAB_CORRELATIONS_BUTTON_TEST_ID,
  INSIGHTS_TAB_ENTITIES_BUTTON_TEST_ID,
  INSIGHTS_TAB_PREVALENCE_BUTTON_TEST_ID,
  INSIGHTS_TAB_THREAT_INTELLIGENCE_BUTTON_TEST_ID,
} from './test_ids';
import { CORRELATIONS_TAB_ID, CorrelationsDetails } from './components/correlations_details';
import { PREVALENCE_TAB_ID, PrevalenceDetails } from './components/prevalence_details';
import {
  THREAT_INTELLIGENCE_TAB_ID,
  ThreatIntelligenceDetails,
} from './components/threat_intelligence_details';
import { EntitiesDetails } from './components/entities_details';
import type { InsightsPanelPaths } from '.';

const ENTITIES_TAB_ID = 'entity';

export interface LeftPanelTabType {
  id: InsightsPanelPaths;
  'data-test-subj': string;
  name: ReactElement;
  content: React.ReactElement;
}

export const entitiesTab: LeftPanelTabType = {
  id: ENTITIES_TAB_ID,
  'data-test-subj': INSIGHTS_TAB_ENTITIES_BUTTON_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.flyout.left.insights.entitiesButtonLabel"
      defaultMessage="Entities"
    />
  ),
  content: <EntitiesDetails />,
};

export const threatIntelligenceTab: LeftPanelTabType = {
  id: THREAT_INTELLIGENCE_TAB_ID,
  'data-test-subj': INSIGHTS_TAB_THREAT_INTELLIGENCE_BUTTON_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.flyout.left.insights.threatIntelligenceButtonLabel"
      defaultMessage="Threat intelligence"
    />
  ),
  content: <ThreatIntelligenceDetails />,
};

export const prevalenceTab: LeftPanelTabType = {
  id: PREVALENCE_TAB_ID,
  'data-test-subj': INSIGHTS_TAB_PREVALENCE_BUTTON_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.flyout.left.insights.prevalenceButtonLabel"
      defaultMessage="Prevalence"
    />
  ),
  content: <PrevalenceDetails />,
};

export const correlationsTab: LeftPanelTabType = {
  id: CORRELATIONS_TAB_ID,
  'data-test-subj': INSIGHTS_TAB_CORRELATIONS_BUTTON_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.flyout.left.insights.correlationsButtonLabel"
      defaultMessage="Correlations"
    />
  ),
  content: <CorrelationsDetails />,
};
