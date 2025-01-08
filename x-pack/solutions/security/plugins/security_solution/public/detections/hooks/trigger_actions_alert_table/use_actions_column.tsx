/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import React, { useCallback, useContext, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type {
  AlertsTableConfigurationRegistry,
  RenderCustomActionsRowArgs,
} from '@kbn/triggers-actions-ui-plugin/public/types';
import { TableId } from '@kbn/securitysolution-data-table';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { ENABLE_VISUALIZATIONS_IN_FLYOUT_SETTING } from '../../../../common/constants';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { StatefulEventContext } from '../../../common/components/events_viewer/stateful_event_context';
import { eventsViewerSelector } from '../../../common/components/events_viewer/selectors';
import { getDefaultControlColumn } from '../../../timelines/components/timeline/body/control_columns';
import { useLicense } from '../../../common/hooks/use_license';
import type { TimelineItem } from '../../../../common/search_strategy';
import { getAlertsDefaultModel } from '../../components/alerts_table/default_config';
import type { State } from '../../../common/store';
import { RowAction } from '../../../common/components/control_columns/row_action';

// we show a maximum of 6 action buttons
// - open flyout
// - investigate in timeline
// - 3-dot menu for more actions
// - add new note
// - session view
// - analyzer graph
const MAX_ACTION_BUTTON_COUNT = 6;

export const getUseActionColumnHook =
  (tableId: TableId): AlertsTableConfigurationRegistry['useActionsColumn'] =>
  () => {
    let ACTION_BUTTON_COUNT = MAX_ACTION_BUTTON_COUNT;

    // hiding the session view icon for users without enterprise plus license
    const license = useLicense();
    const isEnterprisePlus = license.isEnterprise();
    if (!isEnterprisePlus) {
      ACTION_BUTTON_COUNT--;
    }

    // we only want to show the note icon if the new notes system feature flag is enabled
    const securitySolutionNotesDisabled = useIsExperimentalFeatureEnabled(
      'securitySolutionNotesDisabled'
    );
    if (securitySolutionNotesDisabled) {
      ACTION_BUTTON_COUNT--;
    }

    // we do not show the analyzer graph and session view icons on the cases alerts tab alerts table
    // if the visualization in flyout advanced settings is disabled because these aren't supported inside the table
    if (tableId === TableId.alertsOnCasePage) {
      const [visualizationInFlyoutEnabled] = useUiSetting$<boolean>(
        ENABLE_VISUALIZATIONS_IN_FLYOUT_SETTING
      );
      if (!isEnterprisePlus && !visualizationInFlyoutEnabled) {
        ACTION_BUTTON_COUNT -= 1;
      } else if (isEnterprisePlus && !visualizationInFlyoutEnabled) {
        ACTION_BUTTON_COUNT -= 2;
      }
    }

    const eventContext = useContext(StatefulEventContext);

    const leadingControlColumn = useMemo(
      () => getDefaultControlColumn(ACTION_BUTTON_COUNT)[0],
      [ACTION_BUTTON_COUNT]
    );

    const {
      dataTable: {
        columns: columnHeaders,
        showCheckboxes,
        selectedEventIds,
        loadingEventIds,
      } = getAlertsDefaultModel(license),
    } = useSelector((state: State) => eventsViewerSelector(state, tableId));

    const renderCustomActionsRow = useCallback(
      ({
        rowIndex,
        cveProps,
        setIsActionLoading,
        refresh: alertsTableRefresh,
        clearSelection,
        ecsAlert: alert,
        nonEcsData,
      }: RenderCustomActionsRowArgs) => {
        const timelineItem: TimelineItem = {
          _id: (alert as Ecs)._id,
          _index: (alert as Ecs)._index,
          ecs: alert as Ecs,
          data: nonEcsData,
        };

        return (
          <RowAction
            columnId={`actions-${rowIndex}`}
            columnHeaders={columnHeaders}
            controlColumn={leadingControlColumn}
            data={timelineItem}
            disabled={false}
            index={rowIndex}
            isDetails={cveProps.isDetails}
            isExpanded={cveProps.isExpanded}
            isEventViewer={false}
            isExpandable={cveProps.isExpandable}
            loadingEventIds={loadingEventIds}
            onRowSelected={() => {}}
            rowIndex={cveProps.rowIndex}
            colIndex={cveProps.colIndex}
            pageRowIndex={rowIndex}
            selectedEventIds={selectedEventIds}
            setCellProps={cveProps.setCellProps}
            showCheckboxes={showCheckboxes}
            onRuleChange={eventContext?.onRuleChange}
            tabType={'query'}
            tableId={tableId}
            width={0}
            setEventsLoading={({ isLoading }) => {
              if (!isLoading) {
                clearSelection();
                return;
              }
              if (setIsActionLoading) setIsActionLoading(isLoading);
            }}
            setEventsDeleted={() => {}}
            refetch={alertsTableRefresh}
          />
        );
      },
      [
        columnHeaders,
        loadingEventIds,
        showCheckboxes,
        leadingControlColumn,
        selectedEventIds,
        eventContext,
      ]
    );

    return {
      renderCustomActionsRow,
      width: leadingControlColumn.width,
    };
  };
