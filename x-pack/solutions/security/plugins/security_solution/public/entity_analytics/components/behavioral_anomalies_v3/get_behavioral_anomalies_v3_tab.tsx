/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EntityDetailsLeftPanelTab } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { PREFIX } from '../../../flyout/shared/test_ids';
import { BehavioralAnomaliesV3Tab } from './tabs/behavioral_anomalies_tab';
import { BEHAVIORAL_ANOMALIES_V3_TAB_LABEL } from './translations';

export const BEHAVIORAL_ANOMALIES_V3_TAB_TEST_ID = `${PREFIX}BehavioralAnomaliesV3Tab` as const;

/**
 * BA-v.3 prototype tab factory. Wired alongside the original v1 tab so we can
 * show multiple design versions in the same flyout. Deleting this folder and
 * its entry in `entity_details_flyout/index.tsx` + the host/user/service tab
 * hooks removes v3 cleanly.
 */
export const getBehavioralAnomaliesV3Tab = () => ({
  id: EntityDetailsLeftPanelTab.BEHAVIORAL_ANOMALIES_V3,
  'data-test-subj': BEHAVIORAL_ANOMALIES_V3_TAB_TEST_ID,
  name: BEHAVIORAL_ANOMALIES_V3_TAB_LABEL,
  content: <BehavioralAnomaliesV3Tab />,
});
