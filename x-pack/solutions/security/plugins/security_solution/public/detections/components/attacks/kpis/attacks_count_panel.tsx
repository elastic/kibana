/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AlertsCountPanel } from '../../alerts_kpis/alerts_count_panel';
import { CHART_PANEL_HEIGHT } from './common/constants';
import { useAttacksKpiState } from './common/use_attacks_kpi_state';
import { useEuiComboBoxReset } from '../../../../common/components/use_combo_box_reset';
import * as i18n from '../../alerts_kpis/chart_panels/chart_select/translations';

import { useUserData } from '../../user_info';
import type { AttacksKpiPanelBaseProps } from './types';

/**
 * Renders the Attacks Count KPI panel, wrapping the AlertsCountPanel.
 */
export const AttacksCountPanel = React.memo(
  ({ filters, title, isExpanded, setIsExpanded }: AttacksKpiPanelBaseProps) => {
    const { stackBy0, setStackBy0, stackBy1, setStackBy1 } = useAttacksKpiState();
    const [{ signalIndexName }] = useUserData();

    const {
      comboboxRef: stackByField0ComboboxRef,
      setComboboxInputRef: setStackByField0ComboboxInputRef,
    } = useEuiComboBoxReset();

    const {
      comboboxRef: stackByField1ComboboxRef,
      setComboboxInputRef: setStackByField1ComboboxInputRef,
    } = useEuiComboBoxReset();

    return (
      <AlertsCountPanel
        panelHeight={CHART_PANEL_HEIGHT}
        filters={filters}
        signalIndexName={signalIndexName}
        title={title}
        inspectTitle={i18n.COUNTS}
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
        stackByField0={stackBy0}
        setStackByField0={setStackBy0}
        stackByField0ComboboxRef={stackByField0ComboboxRef}
        setStackByField0ComboboxInputRef={setStackByField0ComboboxInputRef}
        stackByField1={stackBy1}
        setStackByField1={setStackBy1}
        stackByField1ComboboxRef={stackByField1ComboboxRef}
        setStackByField1ComboboxInputRef={setStackByField1ComboboxInputRef}
        alignHeader="flexStart"
      />
    );
  }
);

AttacksCountPanel.displayName = 'AttacksCountPanel';
