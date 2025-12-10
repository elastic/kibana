/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { EuiFlyout } from '@elastic/eui';
import { find } from 'lodash/fp';
import { useBasicDataFromDetailsData } from '../hooks/use_basic_data_from_details_data';
import type { Status } from '../../../../../common/api/detection_engine';
import { getAlertDetailsFieldValue } from '../../../../common/lib/endpoint/utils/get_event_details_field_values';
import { TakeActionDropdown } from './take_action_dropdown';
import { AddExceptionFlyoutWrapper } from '../../../../detections/components/alerts_table/timeline_actions/alert_context_menu';
import { EventFiltersFlyout } from '../../../../management/pages/event_filters/view/components/event_filters_flyout';
import { OsqueryFlyout } from '../../../../detections/components/osquery/osquery_flyout';
import { useDocumentDetailsContext } from '../context';
import { useHostIsolation } from '../hooks/use_host_isolation';
import { useRefetchByScope } from '../../right/hooks/use_refetch_by_scope';
import { useExceptionFlyout } from '../../../../detections/components/alerts_table/timeline_actions/use_add_exception_flyout';
import { isActiveTimeline } from '../../../../helpers';
import { useEventFilterModal } from '../../../../detections/components/alerts_table/timeline_actions/use_event_filter_modal';
import { IsolateHostPanelHeader } from '../../isolate_host/header';
import { IsolateHostPanelContent } from '../../isolate_host/content';

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
  const { dataFormattedForFieldBrowser, dataAsNestedObject, refetchFlyoutData, scopeId } =
    useDocumentDetailsContext();

  // host isolation interaction
  const {
    isolateAction,
    isHostIsolationPanelOpen,
    showHostIsolationPanel,
    isIsolateActionSuccessBannerVisible,
    handleIsolationActionSuccess,
    showAlertDetails,
  } = useHostIsolation();

  const { hostName } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);

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
          isHostIsolationPanelOpen={isHostIsolationPanelOpen}
          onAddEventFilterClick={onAddEventFilterClick}
          onAddExceptionTypeClick={onAddExceptionTypeClick}
          onAddIsolationStatusClick={showHostIsolationPanel}
          refetchFlyoutData={refetchFlyoutData}
          refetch={refetchAll}
          scopeId={scopeId}
          onOsqueryClick={setOsqueryFlyoutOpenWithAgentId}
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

      {isHostIsolationPanelOpen && (
        <EuiFlyout onClose={showAlertDetails} size="m">
          <IsolateHostPanelHeader
            isolateAction={isolateAction}
            data={dataFormattedForFieldBrowser}
          />
          <IsolateHostPanelContent
            isIsolateActionSuccessBannerVisible={isIsolateActionSuccessBannerVisible}
            hostName={hostName}
            alertId={alertId ?? undefined}
            isolateAction={isolateAction}
            dataFormattedForFieldBrowser={dataFormattedForFieldBrowser}
            showAlertDetails={showAlertDetails}
            handleIsolationActionSuccess={handleIsolationActionSuccess}
          />
        </EuiFlyout>
      )}
    </>
  );
};

TakeActionButton.displayName = 'TakeActionButton';
