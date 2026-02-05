/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

import { EuiCheckbox } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import type { TableId } from '@kbn/securitysolution-data-table';
import { dataTableActions } from '@kbn/securitysolution-data-table';
import { SECURITY_CELL_ACTIONS_DEFAULT } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { PageScope } from '../../../data_view_manager/constants';
import { useBulkAddEventsToCaseActions } from '../../../cases/components/case_events/use_bulk_event_actions';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import type { CustomBulkAction } from '../../../../common/types';
import { RowRendererValues } from '../../../../common/api/timeline';
import { StatefulEventsViewer } from '../events_viewer';
import { eventsDefaultModel } from '../events_viewer/default_model';
import { MatrixHistogram } from '../matrix_histogram';
import { useGlobalFullScreen } from '../../containers/use_full_screen';
import * as i18n from './translations';
import { DEFAULT_NUMBER_FORMAT } from '../../../../common/constants';
import {
  alertsHistogramConfig,
  eventsHistogramConfig,
  getSubtitleFunction,
} from './histogram_configurations';
import { getDefaultControlColumn } from '../../../timelines/components/timeline/body/control_columns';
import { defaultRowRenderers } from '../../../timelines/components/timeline/body/renderers';
import { DefaultCellRenderer } from '../../../timelines/components/timeline/cell_rendering/default_cell_renderer';
import type { GlobalTimeArgs } from '../../containers/use_global_time';
import type { QueryTabBodyProps as UserQueryTabBodyProps } from '../../../explore/users/pages/navigation/types';
import type { QueryTabBodyProps as HostQueryTabBodyProps } from '../../../explore/hosts/pages/navigation/types';
import type { QueryTabBodyProps as NetworkQueryTabBodyProps } from '../../../explore/network/pages/navigation/types';
import { useLicense } from '../../hooks/use_license';

import { useUiSetting$ } from '../../lib/kibana';
import { defaultAlertsFilters } from '../events_viewer/external_alerts_filter';
import { useAddBulkToTimelineAction } from '../../../detections/components/alerts_table/timeline_actions/use_add_bulk_to_timeline';

import {
  useGetInitialUrlParamValue,
  useReplaceUrlParams,
} from '../../utils/global_query_string/helpers';
import type { BulkActionsProp } from '../toolbar/bulk_actions/types';
import { useUserPrivileges } from '../user_privileges';

export const ALERTS_EVENTS_HISTOGRAM_ID = 'alertsOrEventsHistogramQuery';

type QueryTabBodyProps = UserQueryTabBodyProps | HostQueryTabBodyProps | NetworkQueryTabBodyProps;

export type EventsQueryTabBodyComponentProps = Omit<QueryTabBodyProps, 'setQuery'> & {
  additionalFilters: Filter[];
  deleteQuery?: GlobalTimeArgs['deleteQuery'];
  indexNames: string[];
  tableId: TableId;
};

const EXTERNAL_ALERTS_URL_PARAM = 'onlyExternalAlerts';

// we show a maximum of 6 action buttons
// - open flyout
// - investigate in timeline
// - 3-dot menu for more actions
// - add new note
// - session view
// - analyzer graph
const MAX_ACTION_BUTTON_COUNT = 6;

const EventsQueryTabBodyComponent: React.FC<EventsQueryTabBodyComponentProps> = ({
  additionalFilters,
  deleteQuery,
  endDate,
  filterQuery,
  startDate,
  tableId,
}) => {
  let ACTION_BUTTON_COUNT = MAX_ACTION_BUTTON_COUNT;

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');

  const dispatch = useDispatch();
  const { globalFullScreen } = useGlobalFullScreen();
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);

  const isEnterprisePlus = useLicense().isEnterprise();
  if (!isEnterprisePlus) {
    ACTION_BUTTON_COUNT--;
  }

  const {
    notesPrivileges: { read: canReadNotes },
  } = useUserPrivileges();
  if (!canReadNotes) {
    ACTION_BUTTON_COUNT--;
  }

  const leadingControlColumns = useMemo(
    () => getDefaultControlColumn(ACTION_BUTTON_COUNT),
    [ACTION_BUTTON_COUNT]
  );

  const showExternalAlertsInitialUrlState = useExternalAlertsInitialUrlState();

  const [showExternalAlerts, setShowExternalAlerts] = useState(
    showExternalAlertsInitialUrlState ?? false
  );

  useSyncExternalAlertsUrlState(showExternalAlerts);

  const toggleExternalAlerts = useCallback(() => setShowExternalAlerts((s) => !s), []);
  const getHistogramSubtitle = useMemo(
    () => getSubtitleFunction(defaultNumberFormat, showExternalAlerts),
    [defaultNumberFormat, showExternalAlerts]
  );

  useEffect(() => {
    dispatch(
      dataTableActions.initializeDataTableSettings({
        id: tableId,
        defaultColumns: eventsDefaultModel.columns,
        title: i18n.EVENTS_GRAPH_TITLE,
        showCheckboxes: true,
        selectAll: true,
      })
    );
  }, [dispatch, showExternalAlerts, tableId]);

  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: ALERTS_EVENTS_HISTOGRAM_ID });
      }
    };
  }, [deleteQuery]);

  const toggleExternalAlertsCheckbox = useMemo(
    () => (
      <EuiCheckbox
        id="showExternalAlertsCheckbox"
        data-test-subj="showExternalAlertsCheckbox"
        aria-label={i18n.SHOW_EXTERNAL_ALERTS}
        checked={showExternalAlerts}
        color="text"
        label={i18n.SHOW_EXTERNAL_ALERTS}
        onChange={toggleExternalAlerts}
      />
    ),
    [showExternalAlerts, toggleExternalAlerts]
  );

  const defaultModel = useMemo(
    () => ({
      ...eventsDefaultModel,
      excludedRowRendererIds: showExternalAlerts ? RowRendererValues : [],
    }),
    [showExternalAlerts]
  );

  const composedPageFilters = useMemo(
    () => (showExternalAlerts ? [defaultAlertsFilters, ...additionalFilters] : additionalFilters),
    [additionalFilters, showExternalAlerts]
  );

  const addBulkToTimelineAction = useAddBulkToTimelineAction({
    localFilters: composedPageFilters,
    tableId,
    from: startDate,
    to: endDate,
    scopeId: PageScope.default,
  }) as CustomBulkAction;

  const caseEventsBulkActions = useBulkAddEventsToCaseActions({
    clearSelection: () => dispatch(dataTableActions.clearSelected({ id: tableId })),
  });

  const bulkActions = useMemo<BulkActionsProp | boolean>(() => {
    return {
      alertStatusActions: false,
      customBulkActions: [addBulkToTimelineAction, ...caseEventsBulkActions],
    };
  }, [addBulkToTimelineAction, caseEventsBulkActions]);

  return (
    <>
      {!globalFullScreen && (
        <MatrixHistogram
          id={ALERTS_EVENTS_HISTOGRAM_ID}
          startDate={startDate}
          endDate={endDate}
          filterQuery={filterQuery}
          {...(showExternalAlerts ? alertsHistogramConfig : eventsHistogramConfig)}
          subtitle={getHistogramSubtitle}
          sourcererScopeId={newDataViewPickerEnabled ? PageScope.explore : PageScope.default}
        />
      )}
      <StatefulEventsViewer
        topRightMenuOptions={toggleExternalAlertsCheckbox}
        cellActionsTriggerId={SECURITY_CELL_ACTIONS_DEFAULT}
        start={startDate}
        end={endDate}
        leadingControlColumns={leadingControlColumns}
        renderCellValue={DefaultCellRenderer}
        rowRenderers={defaultRowRenderers}
        sourcererScope={newDataViewPickerEnabled ? PageScope.explore : PageScope.default}
        tableId={tableId}
        unit={showExternalAlerts ? i18n.EXTERNAL_ALERTS_UNIT : i18n.EVENTS_UNIT}
        defaultModel={defaultModel}
        pageFilters={composedPageFilters}
        bulkActions={bulkActions}
      />
    </>
  );
};

EventsQueryTabBodyComponent.displayName = 'EventsQueryTabBodyComponent';

export const EventsQueryTabBody = React.memo(EventsQueryTabBodyComponent);

EventsQueryTabBody.displayName = 'EventsQueryTabBody';

const useExternalAlertsInitialUrlState = () => {
  const replaceUrlParams = useReplaceUrlParams();

  const getInitialUrlParamValue = useGetInitialUrlParamValue<boolean>(EXTERNAL_ALERTS_URL_PARAM);

  const showExternalAlertsInitialUrlState = useMemo(
    () => getInitialUrlParamValue(),
    [getInitialUrlParamValue]
  );

  useEffect(() => {
    // Only called on component unmount
    return () => {
      replaceUrlParams({
        [EXTERNAL_ALERTS_URL_PARAM]: null,
      });
    };
  }, [replaceUrlParams]);

  return showExternalAlertsInitialUrlState;
};

/**
 * Update URL state when showExternalAlerts value changes
 */
const useSyncExternalAlertsUrlState = (showExternalAlerts: boolean) => {
  const replaceUrlParams = useReplaceUrlParams();
  useEffect(() => {
    replaceUrlParams({
      [EXTERNAL_ALERTS_URL_PARAM]: showExternalAlerts ? true : null,
    });
  }, [showExternalAlerts, replaceUrlParams]);
};
