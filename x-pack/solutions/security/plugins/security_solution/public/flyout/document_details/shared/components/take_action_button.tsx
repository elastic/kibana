/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { find } from 'lodash/fp';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { EsHitRecord } from '@kbn/discover-utils';
import { useStore } from 'react-redux';
import { useHistory } from 'react-router-dom';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import type { Status } from '../../../../../common/api/detection_engine';
import { getAlertDetailsFieldValue } from '../../../../common/lib/endpoint/utils/get_event_details_field_values';
import { TakeActionDropdown } from './take_action_dropdown';
import { AddExceptionFlyoutWrapper } from '../../../../detections/components/alerts_table/timeline_actions/alert_context_menu';
import { EventFiltersFlyout } from '../../../../management/pages/event_filters/view/components/event_filters_flyout';
import { OsqueryFlyout } from '../../../../detections/components/osquery/osquery_flyout';
import { useDocumentDetailsContext } from '../context';
import { useRefetchByScope } from '../../../../flyout_v2/document/main/hooks/use_refetch_by_scope';
import { useExceptionFlyout } from '../../../../detections/components/alerts_table/timeline_actions/use_add_exception_flyout';
import { isActiveTimeline } from '../../../../helpers';
import { useEventFilterModal } from '../../../../detections/components/alerts_table/timeline_actions/use_event_filter_modal';
import { useKibana } from '../../../../common/lib/kibana';
import { flyoutProviders } from '../../../../flyout_v2/shared/components/flyout_provider';
import { defaultToolsFlyoutProperties } from '../../../../flyout_v2/shared/hooks/use_default_flyout_properties';
import { documentFlyoutHistoryKey } from '../../../../flyout_v2/shared/constants/flyout_history';
import { HostIsolation } from '../../../../flyout_v2/document/tools/host_isolation';
import type { HostIsolationAction } from '../../../../common/components/endpoint/host_isolation/from_alerts/use_host_isolation_action';

interface AlertSummaryData {
  /**
   * Status of the alert (open, closed...)
   */
  alertStatus: Status;
  /**
   * Id of the document
   */
  eventId: string;
  /**
   * Id of the rule
   */
  ruleId: string;
  /**
   * Property ruleId on the rule
   */
  ruleRuleId: string;
  /**
   * Name of the rule
   */
  ruleName: string;
}

/**
 * Take action button in the panel footer
 */
export const TakeActionButton: FC = () => {
  const { closeFlyout } = useExpandableFlyoutApi();
  const {
    dataFormattedForFieldBrowser,
    dataAsNestedObject,
    refetchFlyoutData,
    scopeId,
    searchHit,
  } = useDocumentDetailsContext();

  const { services } = useKibana();
  const { overlays } = services;
  const store = useStore();
  const history = useHistory();
  const hostIsolationFlyoutRef = useRef<OverlayRef | null>(null);

  const hit = useMemo(
    () => (searchHit ? buildDataTableRecord(searchHit as EsHitRecord) : undefined),
    [searchHit]
  );

  const openHostIsolation = useCallback(
    (action: HostIsolationAction) => {
      if (!hit || !dataFormattedForFieldBrowser) {
        return;
      }
      const closeHostIsolation = () => hostIsolationFlyoutRef.current?.close();
      hostIsolationFlyoutRef.current = overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: (
            <HostIsolation
              hit={hit}
              detailsData={dataFormattedForFieldBrowser}
              isolateAction={action}
              onClose={closeHostIsolation}
            />
          ),
        }),
        {
          ...defaultToolsFlyoutProperties,
          historyKey: documentFlyoutHistoryKey,
          session: 'start',
        }
      );
    },
    [dataFormattedForFieldBrowser, history, hit, overlays, services, store]
  );

  const { refetch: refetchAll } = useRefetchByScope({ scopeId });

  // exception interaction
  const ruleIndexRaw = useMemo(
    () =>
      find({ category: 'signal', field: 'signal.rule.index' }, dataFormattedForFieldBrowser)
        ?.values ??
      find(
        { category: 'kibana', field: 'kibana.alert.rule.parameters.index' },
        dataFormattedForFieldBrowser
      )?.values,
    [dataFormattedForFieldBrowser]
  );
  const ruleIndex = useMemo(
    (): string[] | undefined => (Array.isArray(ruleIndexRaw) ? ruleIndexRaw : undefined),
    [ruleIndexRaw]
  );
  const ruleDataViewIdRaw = useMemo(
    () =>
      find({ category: 'signal', field: 'signal.rule.data_view_id' }, dataFormattedForFieldBrowser)
        ?.values ??
      find(
        { category: 'kibana', field: 'kibana.alert.rule.parameters.data_view_id' },
        dataFormattedForFieldBrowser
      )?.values,
    [dataFormattedForFieldBrowser]
  );
  const ruleDataViewId = useMemo(
    (): string | undefined => (Array.isArray(ruleDataViewIdRaw) ? ruleDataViewIdRaw[0] : undefined),
    [ruleDataViewIdRaw]
  );
  const alertSummaryData = useMemo(
    () =>
      [
        { category: 'signal', field: 'signal.rule.id', name: 'ruleId' },
        { category: 'signal', field: 'signal.rule.rule_id', name: 'ruleRuleId' },
        { category: 'signal', field: 'signal.rule.name', name: 'ruleName' },
        { category: 'signal', field: 'kibana.alert.workflow_status', name: 'alertStatus' },
        { category: '_id', field: '_id', name: 'eventId' },
      ].reduce<AlertSummaryData>(
        (acc, curr) => ({
          ...acc,
          [curr.name]: getAlertDetailsFieldValue(
            { category: curr.category, field: curr.field },
            dataFormattedForFieldBrowser
          ),
        }),
        {} as AlertSummaryData
      ),
    [dataFormattedForFieldBrowser]
  );
  const {
    exceptionFlyoutType,
    openAddExceptionFlyout,
    onAddExceptionTypeClick,
    onAddExceptionCancel,
    onAddExceptionConfirm,
  } = useExceptionFlyout({
    refetch: refetchAll,
    isActiveTimelines: isActiveTimeline(scopeId),
  });

  // event filter interaction
  const { closeAddEventFilterModal, isAddEventFilterModalOpen, onAddEventFilterClick } =
    useEventFilterModal();

  // osquery interaction
  const [isOsqueryFlyoutOpenWithAgentId, setOsqueryFlyoutOpenWithAgentId] = useState<null | string>(
    null
  );
  const closeOsqueryFlyout = useCallback(() => {
    setOsqueryFlyoutOpenWithAgentId(null);
  }, [setOsqueryFlyoutOpenWithAgentId]);
  const alertId = useMemo(
    () => (dataAsNestedObject?.kibana?.alert ? dataAsNestedObject?._id : null),
    [dataAsNestedObject?._id, dataAsNestedObject?.kibana?.alert]
  );

  return (
    <>
      {dataAsNestedObject && (
        <TakeActionDropdown
          dataFormattedForFieldBrowser={dataFormattedForFieldBrowser}
          dataAsNestedObject={dataAsNestedObject}
          handleOnEventClosed={closeFlyout}
          onAddEventFilterClick={onAddEventFilterClick}
          onAddExceptionTypeClick={onAddExceptionTypeClick}
          onAddIsolationStatusClick={openHostIsolation}
          refetchFlyoutData={refetchFlyoutData}
          refetch={refetchAll}
          scopeId={scopeId}
          onOsqueryClick={setOsqueryFlyoutOpenWithAgentId}
          searchHit={searchHit}
        />
      )}

      {openAddExceptionFlyout &&
        alertSummaryData.ruleId != null &&
        alertSummaryData.ruleRuleId != null &&
        alertSummaryData.eventId != null && (
          <AddExceptionFlyoutWrapper
            {...alertSummaryData}
            ruleIndices={ruleIndex}
            ruleDataViewId={ruleDataViewId}
            exceptionListType={exceptionFlyoutType}
            onCancel={onAddExceptionCancel}
            onConfirm={onAddExceptionConfirm}
          />
        )}

      {isAddEventFilterModalOpen && dataAsNestedObject != null && (
        <EventFiltersFlyout data={dataAsNestedObject} onCancel={closeAddEventFilterModal} />
      )}

      {isOsqueryFlyoutOpenWithAgentId && dataAsNestedObject != null && (
        <OsqueryFlyout
          agentId={isOsqueryFlyoutOpenWithAgentId}
          defaultValues={alertId ? { alertIds: [alertId] } : undefined}
          onClose={closeOsqueryFlyout}
          ecsData={dataAsNestedObject}
        />
      )}
    </>
  );
};

TakeActionButton.displayName = 'TakeActionButton';
