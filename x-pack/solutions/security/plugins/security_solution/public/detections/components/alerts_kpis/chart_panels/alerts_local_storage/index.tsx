/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocalStorage } from '../../../../../common/components/local_storage';
import {
  getSettingKey,
  isDefaultWhenEmptyString,
} from '../../../../../common/components/local_storage/helpers';

import {
  ALERTS_PAGE,
  ALERT_VIEW_SELECTION_SETTING_NAME,
  TABLE_CATEGORY,
  EXPAND_SETTING_NAME,
  TREEMAP_CATEGORY,
  STACK_BY_0_SETTING_NAME,
  STACK_BY_1_SETTING_NAME,
  STACK_BY_SETTING_NAME,
  TREND_CHART_CATEGORY,
  VIEW_CATEGORY,
  GROUP_BY_SETTING_NAME,
} from './constants';
import { DEFAULT_STACK_BY_FIELD, DEFAULT_STACK_BY_FIELD1 } from '../../common/config';
import type { AlertsSettings } from './types';
import type { AlertViewSelection } from '../chart_select/helpers';
import { CHARTS_ID } from '../chart_select/helpers';
import type { GroupBySelection } from '../../alerts_progress_bar_panel/types';

export const useAlertsLocalStorage = (): AlertsSettings => {
  const [alertViewSelection, setAlertViewSelection] = useLocalStorage<AlertViewSelection>({
    defaultValue: CHARTS_ID,
    key: getSettingKey({
      category: VIEW_CATEGORY,
      page: ALERTS_PAGE,
      setting: ALERT_VIEW_SELECTION_SETTING_NAME,
    }),
    isInvalidDefault: isDefaultWhenEmptyString,
  });

  const [groupBySelection, setGroupBySelection] = useLocalStorage<GroupBySelection>({
    defaultValue: 'host.name',
    key: getSettingKey({
      category: VIEW_CATEGORY,
      page: ALERTS_PAGE,
      setting: GROUP_BY_SETTING_NAME,
    }),
    isInvalidDefault: isDefaultWhenEmptyString,
  });

  const [isTreemapPanelExpanded, setIsTreemapPanelExpanded] = useLocalStorage<boolean>({
    defaultValue: true,
    key: getSettingKey({
      category: TREEMAP_CATEGORY,
      page: ALERTS_PAGE,
      setting: EXPAND_SETTING_NAME,
    }),
  });

  const [riskChartStackBy0, setRiskChartStackBy0] = useLocalStorage<string>({
    defaultValue: DEFAULT_STACK_BY_FIELD,
    key: getSettingKey({
      category: TREEMAP_CATEGORY,
      page: ALERTS_PAGE,
      setting: STACK_BY_0_SETTING_NAME,
    }),
    isInvalidDefault: isDefaultWhenEmptyString,
  });

  const [riskChartStackBy1, setRiskChartStackBy1] = useLocalStorage<string | undefined>({
    defaultValue: DEFAULT_STACK_BY_FIELD1,
    key: getSettingKey({
      category: TREEMAP_CATEGORY,
      page: ALERTS_PAGE,
      setting: STACK_BY_1_SETTING_NAME,
    }),
  });

  const [countTableStackBy0, setCountTableStackBy0] = useLocalStorage<string>({
    defaultValue: DEFAULT_STACK_BY_FIELD,
    key: getSettingKey({
      category: TABLE_CATEGORY,
      page: ALERTS_PAGE,
      setting: STACK_BY_0_SETTING_NAME,
    }),
    isInvalidDefault: isDefaultWhenEmptyString,
  });

  const [countTableStackBy1, setCountTableStackBy1] = useLocalStorage<string | undefined>({
    defaultValue: DEFAULT_STACK_BY_FIELD1,
    key: getSettingKey({
      category: TABLE_CATEGORY,
      page: ALERTS_PAGE,
      setting: STACK_BY_1_SETTING_NAME,
    }),
  });

  const [trendChartStackBy, setTrendChartStackBy] = useLocalStorage<string>({
    defaultValue: DEFAULT_STACK_BY_FIELD,
    key: getSettingKey({
      category: TREND_CHART_CATEGORY,
      page: ALERTS_PAGE,
      setting: STACK_BY_SETTING_NAME,
    }),
    isInvalidDefault: isDefaultWhenEmptyString,
  });

  return {
    alertViewSelection,
    countTableStackBy0,
    countTableStackBy1,
    groupBySelection,
    isTreemapPanelExpanded,
    riskChartStackBy0,
    riskChartStackBy1,
    setAlertViewSelection,
    setCountTableStackBy0,
    setCountTableStackBy1,
    setGroupBySelection,
    setIsTreemapPanelExpanded,
    setRiskChartStackBy0,
    setRiskChartStackBy1,
    setTrendChartStackBy,
    trendChartStackBy,
  };
};
