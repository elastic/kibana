/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { EsHitRecord } from '@kbn/discover-utils';
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
import { HostIsolationFlyout } from '../../../../common/components/endpoint/host_isolation/from_alerts/host_isolation_flyout';
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

  const hit = useMemo(
    () => (searchHit ? buildDataTableRecord(searchHit as EsHitRecord) : undefined),
    [searchHit]
  );

  const [isolateAction, setIsolateAction] = useState<HostIsolationAction | null>(null);

  const { refetch: refetchAll } = useRefetchByScope({ scopeId });

  // exception interaction
  const alertSummaryData = useMemo(
    () =>
      [
        { category: 'signal', field: 'signal.rule.id', name: 'ruleId' },
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
  }, []);
  const alertId = useMemo(
    () => (dataAsNestedObject?.kibana?.alert ? dataAsNestedObject?._id : null),
    [dataAsNestedObject?._id, dataAsNestedObject?.kibana?.alert]
  );

  return (
    <>
      {isolateAction !== null && hit != null && (
        <HostIsolationFlyout
          hit={hit}
          detailsData={dataFormattedForFieldBrowser}
          isolateAction={isolateAction}
          onClose={() => setIsolateAction(null)}
        />
      )}

      {dataAsNestedObject && (
        <TakeActionDropdown
          dataFormattedForFieldBrowser={dataFormattedForFieldBrowser}
          dataAsNestedObject={dataAsNestedObject}
          handleOnEventClosed={closeFlyout}
          onAddEventFilterClick={onAddEventFilterClick}
          onAddExceptionTypeClick={onAddExceptionTypeClick}
          onAddIsolationStatusClick={setIsolateAction}
          refetchFlyoutData={refetchFlyoutData}
          refetch={refetchAll}
          scopeId={scopeId}
          onOsqueryClick={setOsqueryFlyoutOpenWithAgentId}
          searchHit={searchHit}
        />
      )}

      {openAddExceptionFlyout &&
        hit != null &&
        alertSummaryData.ruleId != null &&
        alertSummaryData.eventId != null && (
          <AddExceptionFlyoutWrapper
            hit={hit}
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
