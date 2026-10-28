/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KubernetesPageHeaderMenuItem } from '../../types';
import { CHART_TOGGLE_SHOW, CHART_TOGGLE_HIDE } from '../../../common/translations';

export const TOGGLE_TEST_ID = 'kubernetesSecurity:chartToggle';

interface ChartsToggleMenuItemParams {
  shouldHideCharts: boolean;
  onToggle: () => void;
}

export const getChartsToggleMenuItem = ({
  shouldHideCharts,
  onToggle,
}: ChartsToggleMenuItemParams): KubernetesPageHeaderMenuItem => ({
  id: 'toggleCharts',
  label: shouldHideCharts ? CHART_TOGGLE_SHOW : CHART_TOGGLE_HIDE,
  iconType: shouldHideCharts ? 'eye' : 'eyeSlash',
  run: onToggle,
  testId: TOGGLE_TEST_ID,
});
