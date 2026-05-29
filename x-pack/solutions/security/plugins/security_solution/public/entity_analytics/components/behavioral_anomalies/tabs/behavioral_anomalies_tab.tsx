/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { AnomaliesTableSection } from '../components/anomalies_table_section';
import { AnomalyTimelineSection } from '../components/anomaly_timeline_section';
import { BEHAVIORAL_ANOMALIES_TAB_CONTENT_TEST_ID } from '../test_ids';

export const BehavioralAnomaliesTab: React.FC = () => (
  <div data-test-subj={BEHAVIORAL_ANOMALIES_TAB_CONTENT_TEST_ID}>
    <AnomalyTimelineSection />
    <EuiSpacer size="l" />
    <AnomaliesTableSection />
  </div>
);
