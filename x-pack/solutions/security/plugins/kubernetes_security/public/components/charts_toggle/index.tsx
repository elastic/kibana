/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { CHART_TOGGLE_SHOW, CHART_TOGGLE_HIDE } from '../../../common/translations';

export const TOGGLE_TEST_ID = 'kubernetesSecurity:chartToggle';

interface ChartsToggleDeps {
  handleToggleHideCharts: () => void;
  shouldHideCharts?: boolean;
}

export const ChartsToggle = ({
  handleToggleHideCharts,
  shouldHideCharts = false,
}: ChartsToggleDeps) => (
  <EuiButtonEmpty
    onClick={handleToggleHideCharts}
    iconType={shouldHideCharts ? 'eye' : 'eyeClosed'}
    data-test-subj={TOGGLE_TEST_ID}
  >
    {shouldHideCharts ? CHART_TOGGLE_SHOW : CHART_TOGGLE_HIDE}
  </EuiButtonEmpty>
);
