/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBox } from '@elastic/eui';
import type { Action } from '@kbn/ui-actions-plugin/public';
import React, { memo, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Filter } from '@kbn/es-query';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { HeaderSection } from '../../../../common/components/header_section';
import { InspectButtonContainer } from '../../../../common/components/inspect';
import * as i18n from './translations';
import { KpiPanel } from '../common/components';
import { FieldSelection } from '../../../../common/components/field_selection';
import { getAlertsTableLensAttributes as getLensAttributes } from '../../../../common/components/visualization_actions/lens_attributes/common/alerts/alerts_table';
import { SourcererScopeName } from '../../../../sourcerer/store/model';
import { VisualizationEmbeddable } from '../../../../common/components/visualization_actions/visualization_embeddable';

export const DETECTIONS_ALERTS_COUNT_ID = 'detections-alerts-count';
const CHART_HEIGHT = 218; // px

interface AlertsCountPanelProps {
  chartOptionsContextMenu: (queryId: string) => React.ReactNode;
  extraActions: Action[];
  filters: Filter[];
  panelHeight: number;
  setStackByField0: (stackBy: string) => void;
  setStackByField0ComboboxInputRef?: (inputRef: HTMLInputElement | null) => void;
  setStackByField1: (stackBy: string | undefined) => void;
  setStackByField1ComboboxInputRef?: (inputRef: HTMLInputElement | null) => void;
  stackByField0: string;
  stackByField0ComboboxRef?: React.RefObject<EuiComboBox<string | number | string[] | undefined>>;
  stackByField1: string | undefined;
  stackByField1ComboboxRef?: React.RefObject<EuiComboBox<string | number | string[] | undefined>>;
  title: React.ReactNode;
  isExpanded: boolean;
  setIsExpanded: (status: boolean) => void;
}

export const AlertsCountPanel = memo<AlertsCountPanelProps>(
  ({
    chartOptionsContextMenu,
    extraActions,
    filters,
    panelHeight,
    setStackByField0,
    setStackByField0ComboboxInputRef,
    setStackByField1,
    setStackByField1ComboboxInputRef,
    stackByField0,
    stackByField0ComboboxRef,
    stackByField1,
    stackByField1ComboboxRef,
    title = i18n.COUNT_TABLE_TITLE,
    isExpanded,
    setIsExpanded,
  }) => {
    const { to, from } = useGlobalTime();
    // create a unique, but stable (across re-renders) query id
    const uniqueQueryId = useMemo(() => `${DETECTIONS_ALERTS_COUNT_ID}-${uuidv4()}`, []);
    const timerange = useMemo(() => ({ from, to }), [from, to]);

    const extraVisualizationOptions = useMemo(
      () => ({
        breakdownField: stackByField1,
        filters,
      }),
      [filters, stackByField1]
    );

    return (
      <InspectButtonContainer show={isExpanded}>
        <KpiPanel
          height={panelHeight}
          toggleStatus={Boolean(isExpanded)}
          data-test-subj="alertsCountPanel"
        >
          <HeaderSection
            alignHeader="flexStart"
            id={uniqueQueryId}
            inspectTitle={i18n.COUNTS}
            outerDirection="row"
            title={title}
            titleSize="s"
            hideSubtitle
            showInspectButton={chartOptionsContextMenu == null}
            toggleStatus={isExpanded}
            toggleQuery={setIsExpanded}
          >
            <FieldSelection
              setStackByField0={setStackByField0}
              setStackByField0ComboboxInputRef={setStackByField0ComboboxInputRef}
              setStackByField1={setStackByField1}
              setStackByField1ComboboxInputRef={setStackByField1ComboboxInputRef}
              stackByField0={stackByField0}
              stackByField0ComboboxRef={stackByField0ComboboxRef}
              stackByField1={stackByField1}
              stackByField1ComboboxRef={stackByField1ComboboxRef}
              uniqueQueryId={uniqueQueryId}
              useLensCompatibleFields={true}
            />
          </HeaderSection>
          {isExpanded && (
            <VisualizationEmbeddable
              data-test-subj="embeddable-alerts-count"
              extraActions={extraActions}
              extraOptions={extraVisualizationOptions}
              getLensAttributes={getLensAttributes}
              height={CHART_HEIGHT}
              id={`${uniqueQueryId}-embeddable`}
              inspectTitle={i18n.COUNTS}
              scopeId={SourcererScopeName.detections}
              stackByField={stackByField0}
              timerange={timerange}
            />
          )}
        </KpiPanel>
      </InspectButtonContainer>
    );
  }
);

AlertsCountPanel.displayName = 'AlertsCountPanel';
