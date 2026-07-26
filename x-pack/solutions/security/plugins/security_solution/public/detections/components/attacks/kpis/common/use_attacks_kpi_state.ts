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
  DEFAULT_STACK_BY_FIELD,
  DEFAULT_STACK_BY_FIELD1,
} from '../../../alerts_kpis/common/config';
import {
  ALERT_VIEW_SELECTION_SETTING_NAME,
  STACK_BY_0_SETTING_NAME,
  STACK_BY_1_SETTING_NAME,
  GROUP_BY_SETTING_NAME,
  VIEW_CATEGORY,
} from '../../../alerts_kpis/chart_panels/alerts_local_storage/constants';
import { KpiViewSelection } from '../kpi_view_select/helpers';
import type { GroupBySelection } from '../../../alerts_kpis/alerts_progress_bar_panel/types';

const ATTACKS_PAGE = 'attacks';

export interface AttacksKpiState {
  /** The current KPI view selection (e.g., Summary, Trend, Count, Treemap) */
  viewSelection: KpiViewSelection;
  /** Setter for the KPI view selection */
  setViewSelection: (view: KpiViewSelection) => void;
  /** The primary field used for stacking/grouping in charts */
  stackBy0: string;
  /** Setter for the primary stack-by field */
  setStackBy0: (value: string) => void;
  /** The secondary field used for stacking/grouping in charts */
  stackBy1: string | undefined;
  /** Setter for the secondary stack-by field */
  setStackBy1: (value: string | undefined) => void;
  /** The field used for grouping in the summary view */
  groupBySelection: GroupBySelection;
  /** Setter for the group-by field */
  setGroupBySelection: (value: GroupBySelection) => void;
}

/**
 * Custom hook to manage the state of KPI views on the Attacks page.
 * Uses local storage to persist user preferences for view selection, stacking, and grouping.
 * Simplifies state management by using shared settings across different views.
 */
export const useAttacksKpiState = (): AttacksKpiState => {
  const [viewSelection, setViewSelection] = useLocalStorage<KpiViewSelection>({
    defaultValue: KpiViewSelection.Summary,
    key: getSettingKey({
      category: VIEW_CATEGORY,
      page: ATTACKS_PAGE,
      setting: ALERT_VIEW_SELECTION_SETTING_NAME,
    }),
    isInvalidDefault: isDefaultWhenEmptyString,
  });

  // Simplified stackBy: shared across views, unlike Alerts page which has separate but synced settings
  const [stackBy0, setStackBy0] = useLocalStorage<string>({
    defaultValue: DEFAULT_STACK_BY_FIELD,
    key: getSettingKey({
      category: VIEW_CATEGORY, // Using a shared category since it's shared across views
      page: ATTACKS_PAGE,
      setting: STACK_BY_0_SETTING_NAME,
    }),
    isInvalidDefault: isDefaultWhenEmptyString,
  });

  const [stackBy1, setStackBy1] = useLocalStorage<string | undefined>({
    defaultValue: DEFAULT_STACK_BY_FIELD1,
    key: getSettingKey({
      category: VIEW_CATEGORY,
      page: ATTACKS_PAGE,
      setting: STACK_BY_1_SETTING_NAME,
    }),
  });

  const [groupBySelection, setGroupBySelection] = useLocalStorage<GroupBySelection>({
    defaultValue: 'host.name',
    key: getSettingKey({
      category: VIEW_CATEGORY,
      page: ATTACKS_PAGE,
      setting: GROUP_BY_SETTING_NAME,
    }),
    isInvalidDefault: isDefaultWhenEmptyString,
  });

  return {
    viewSelection,
    setViewSelection,
    stackBy0,
    setStackBy0,
    stackBy1,
    setStackBy1,
    groupBySelection,
    setGroupBySelection,
  };
};
