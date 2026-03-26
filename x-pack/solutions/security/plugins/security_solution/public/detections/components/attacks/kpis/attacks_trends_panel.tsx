/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { AlertsHistogramPanel } from '../../alerts_kpis/alerts_histogram_panel';
import { CHART_PANEL_HEIGHT, TREND_CHART_HEIGHT } from './common/constants';
import { useAttacksKpiState } from './common/use_attacks_kpi_state';
import { useEuiComboBoxReset } from '../../../../common/components/use_combo_box_reset';
import { GROUP_BY_LABEL } from '../../alerts_kpis/common/translations';
import * as i18n from '../../alerts_kpis/chart_panels/chart_select/translations';
import { useUserData } from '../../user_info';
import { setAbsoluteRangeDatePicker } from '../../../../common/store/inputs/actions';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import type { UpdateDateRange } from '../../../../common/components/charts/common';
import type { AttacksKpiPanelBaseProps } from './types';

/**
 * Renders the Attacks Trends KPI panel, wrapping the AlertsHistogramPanel.
 */
export const AttacksTrendsPanel = React.memo(
  ({ filters, title, isExpanded, setIsExpanded }: AttacksKpiPanelBaseProps) => {
    const { stackBy0, setStackBy0 } = useAttacksKpiState();
    const dispatch = useDispatch();
    const [{ signalIndexName }] = useUserData();

    const updateDateRange = useCallback<UpdateDateRange>(
      ({ x }) => {
        if (!x) {
          return;
        }
        const [min, max] = x;
        dispatch(
          setAbsoluteRangeDatePicker({
            id: InputsModelId.global,
            from: new Date(min).toISOString(),
            to: new Date(max).toISOString(),
          })
        );
      },
      [dispatch]
    );

    const {
      comboboxRef: stackByField0ComboboxRef,
      setComboboxInputRef: setStackByField0ComboboxInputRef,
    } = useEuiComboBoxReset();

    return (
      <AlertsHistogramPanel
        alignHeader="flexStart"
        chartHeight={TREND_CHART_HEIGHT}
        panelHeight={CHART_PANEL_HEIGHT}
        filters={filters}
        signalIndexName={signalIndexName}
        updateDateRange={updateDateRange}
        defaultStackByOption={stackBy0}
        onFieldSelected={setStackBy0}
        comboboxRef={stackByField0ComboboxRef}
        setComboboxInputRef={setStackByField0ComboboxInputRef}
        title={title}
        titleSize="s"
        stackByLabel={GROUP_BY_LABEL}
        inspectTitle={i18n.TREND}
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
        showTotalAlertsCount={false}
        showGroupByPlaceholder={false}
      />
    );
  }
);

AttacksTrendsPanel.displayName = 'AttacksTrendsPanel';
