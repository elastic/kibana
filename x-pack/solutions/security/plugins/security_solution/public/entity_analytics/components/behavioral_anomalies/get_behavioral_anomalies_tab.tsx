/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EntityDetailsLeftPanelTab } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { PREFIX } from '../../../flyout/shared/test_ids';
import { BehavioralAnomaliesTab } from './tabs/behavioral_anomalies_tab';
import { BEHAVIORAL_ANOMALIES_TAB_LABEL } from './translations';

export const BEHAVIORAL_ANOMALIES_TAB_TEST_ID = `${PREFIX}BehavioralAnomaliesTab` as const;

export const getBehavioralAnomaliesTab = () => ({
  id: EntityDetailsLeftPanelTab.BEHAVIORAL_ANOMALIES,
  'data-test-subj': BEHAVIORAL_ANOMALIES_TAB_TEST_ID,
  name: BEHAVIORAL_ANOMALIES_TAB_LABEL,
  content: <BehavioralAnomaliesTab />,
});
