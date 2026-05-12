/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';

import { EuiButtonIcon, EuiContextMenu, EuiPopover, EuiToolTip } from '@elastic/eui';
import { indexOf } from 'lodash';
import { useSelector } from 'react-redux';
import type { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { get, getOr } from 'lodash/fp';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { TableId } from '@kbn/securitysolution-data-table';
import { flattenObject } from '@kbn/object-utils';
import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { useRunAlertWorkflowPanel } from './use_run_alert_workflow_panel';
import { useRunDocumentWorkflowPanel } from './use_run_document_workflow_panel';
import { DEFAULT_ACTION_BUTTON_WIDTH } from '../../../../common/components/header_actions';
import { isActiveTimeline } from '../../../../helpers';
import { useOsqueryContextActionItem } from '../../osquery/use_osquery_context_action_item';
import { OsqueryFlyout } from '../../osquery/osquery_flyout';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { EventsTdContent } from '../../../../timelines/components/timeline/styles';
import { useOpenAddRuleException } from '../../../../flyout_v2/document/tools/add_rule_exception/hooks/use_open_add_rule_exception';
import * as i18n from '../translations';
import type { inputsModel, State } from '../../../../common/store';
import { inputsSelectors } from '../../../../common/store';
import { EventFiltersFlyout } from '../../../../management/pages/event_filters/view/components/event_filters_flyout';
import { useAlertsActions } from './use_alerts_actions';
import { useAlertExceptionActions } from './use_add_exception_actions';
import { useEventFilterModal } from './use_event_filter_modal';
import { TimelineId } from '../../../../../common/types/timeline';
import type { Status } from '../../../../../common/api/detection_engine';
import { ATTACH_ALERT_TO_CASE_FOR_ROW } from '../../../../timelines/components/timeline/body/translations';
import { selectTimelineById } from '../../../../timelines/store/selectors';
import { useEventFilterAction } from './use_event_filter_action';
import { useAddToCaseActions } from './use_add_to_case_actions';
import type { AlertTableContextMenuItem } from '../types';
import { useAlertTagsActions } from './use_alert_tags_actions';
import { useAlertAssigneesActions } from './use_alert_assignees_actions';
import { timelineDefaults } from '../../../../timelines/store/defaults';
interface AlertContextMenuProps {
  ariaLabel?: string;
  ariaRowindex: number;
  columnValues: string;
  disabled: boolean;
  ecsRowData: Ecs;
  onRuleChange?: () => void;
  scopeId: string;
  refetch: (() => void) | undefined;
}

const AlertContextMenuComponent: React.FC<AlertContextMenuProps> = ({
  ariaLabel = i18n.MORE_ACTIONS,
  ariaRowindex,
  columnValues,
  disabled,
  ecsRowData,
  onRuleChange,
  scopeId,
  refetch,
}) => {
  const [isPopoverOpen, setPopover] = useState(false);
  const [isOsqueryFlyoutOpen, setOsqueryFlyoutOpen] = useState(false);

  const onMenuItemClick = useCallback(() => {
    setPopover(false);
  }, []);
  const { activeTab } = useSelector(
    (state: State) => selectTimelineById(state, TimelineId.active) ?? timelineDefaults
  );
  const getGlobalQueries = useMemo(() => inputsSelectors.globalQuery(), []);
  const getTimelineQuery = useMemo(() => inputsSelectors.timelineQueryByIdSelectorFactory(), []);
  const globalQuery = useSelector((state: State) => getGlobalQueries(state));
  const timelineQuery = useSelector((state: State) =>
    getTimelineQuery(state, `${TimelineId.active}-${activeTab}`)
  );

  const getAlertId = () => (ecsRowData?.kibana?.alert ? ecsRowData?._id : null);
  const alertId = getAlertId();
  const ruleId = get(0, ecsRowData?.kibana?.alert?.rule?.uuid);

  const flattenedEcsData = useMemo(() => {
    const flattened = flattenObject(ecsRowData);
    return Object.entries(flattened).map(([key, value]) => ({
      field: key,
      value: value as string[],
    }));
  }, [ecsRowData]);

  const { addToCaseActionItems } = useAddToCaseActions({
    ecsData: ecsRowData,
    nonEcsData: flattenedEcsData,
    onMenuItemClick,
    ariaLabel: ATTACH_ALERT_TO_CASE_FOR_ROW({ ariaRowindex, columnValues }),
    refetch,
  });

  const { loading: endpointPrivilegesLoading, canWriteEventFilters } =
    useUserPrivileges().endpointPrivileges;
  const canCreateEndpointEventFilters = useMemo(
    () => !endpointPrivilegesLoading && canWriteEventFilters,
    [canWriteEventFilters, endpointPrivilegesLoading]
  );

  const alertStatus = get(0, ecsRowData?.kibana?.alert?.workflow_status) as Status | undefined;

  const isEvent = useMemo(() => indexOf(ecsRowData.event?.kind, 'event') !== -1, [ecsRowData]);
  const isAgentEndpoint = useMemo(() => ecsRowData.agent?.type?.includes('endpoint'), [ecsRowData]);
  const isEndpointEvent = useMemo(() => isEvent && isAgentEndpoint, [isEvent, isAgentEndpoint]);
  const isAlertSourceEndpoint = useMemo(() => {
    const eventModules = getOr([], 'kibana.alert.original_event.module', ecsRowData);
    const kinds = getOr([], 'kibana.alert.original_event.kind', ecsRowData);

    return eventModules.includes('endpoint') && kinds.includes('alert');
  }, [ecsRowData]);

  const scopeIdAllowsAddEndpointEventFilter = useMemo(
    () => scopeId === TableId.hostsPageEvents || scopeId === TableId.usersPageEvents,
    [scopeId]
  );

  const onButtonClick = useCallback(() => {
    setPopover((current) => !current);
  }, []);

  const closePopover = useCallback((): void => {
    setPopover(false);
  }, []);

  const refetchAll = useCallback(() => {
    const refetchQuery = (newQueries: inputsModel.GlobalQuery[]) => {
      newQueries.forEach((q) => q.refetch && (q.refetch as inputsModel.Refetch)());
    };
    if (isActiveTimeline(scopeId ?? '')) {
      refetchQuery([timelineQuery]);
    } else {
      refetchQuery(globalQuery);
    }

    if (refetch) refetch();
  }, [scopeId, globalQuery, timelineQuery, refetch]);

  const hit = useMemo<DataTableRecord>(
    () =>
      buildDataTableRecord({
        _id: ecsRowData._id ?? '',
        _index: ecsRowData._index ?? '',
        _source: ecsRowData as unknown as Record<string, unknown>,
      } as EsHitRecord),
    [ecsRowData]
  );

  const onAddRuleExceptionConfirm = useCallback(
    (didRuleChange: boolean, _didCloseAlert: boolean, didBulkCloseAlert: boolean) => {
      if (!isActiveTimeline(scopeId ?? '') || didBulkCloseAlert) {
        refetchAll();
      }
      if (onRuleChange != null && didRuleChange) {
        onRuleChange();
      }
    },
    [onRuleChange, refetchAll, scopeId]
  );
  const openAddRuleException = useOpenAddRuleException({
    hit,
    onConfirm: onAddRuleExceptionConfirm,
  });

  const { closeAddEventFilterModal, isAddEventFilterModalOpen, onAddEventFilterClick } =
    useEventFilterModal();

  const { actionItems: statusActionItems, panels: statusActionPanels } = useAlertsActions({
    alertStatus,
    eventId: ecsRowData?._id,
    scopeId,
    refetch: refetchAll,
    closePopover,
  });

  const handleOnAddExceptionTypeClick = useCallback(
    (type?: ExceptionListTypeEnum) => {
      closePopover();
      openAddRuleException(type ?? null);
    },
    [closePopover, openAddRuleException]
  );

  const handleOnAddEventFilterClick = useCallback(() => {
    onAddEventFilterClick();
    closePopover();
  }, [closePopover, onAddEventFilterClick]);

  const { exceptionActionItems } = useAlertExceptionActions({
    isEndpointAlert: isAlertSourceEndpoint,
    onAddExceptionTypeClick: handleOnAddExceptionTypeClick,
  });
  const { eventFilterActionItems } = useEventFilterAction({
    onAddEventFilterClick: handleOnAddEventFilterClick,
    disabled: !isEndpointEvent || !scopeIdAllowsAddEndpointEventFilter,
    tooltipMessage: !scopeIdAllowsAddEndpointEventFilter
      ? i18n.ACTION_ADD_EVENT_FILTER_DISABLED_TOOLTIP
      : undefined,
  });
  const agentId = useMemo(() => get(0, ecsRowData?.agent?.id), [ecsRowData]);

  const handleOnOsqueryClick = useCallback(() => {
    setOsqueryFlyoutOpen((prevValue) => !prevValue);
    setPopover(false);
  }, []);

  const { osqueryActionItems } = useOsqueryContextActionItem({ handleClick: handleOnOsqueryClick });

  const { alertTagsItems, alertTagsPanels } = useAlertTagsActions({
    closePopover,
    ecsRowData,
    refetch: refetchAll,
  });

  const { alertAssigneesItems, alertAssigneesPanels } = useAlertAssigneesActions({
    closePopover,
    ecsRowData,
    refetch: refetchAll,
  });

  const { runWorkflowMenuItem, runAlertWorkflowPanel } = useRunAlertWorkflowPanel({
    closePopover,
    ecsRowData,
  });

  const documentForWorkflow = useMemo(() => {
    const fields: Record<string, unknown> = {};
    for (const { field, value } of flattenedEcsData) {
      fields[field] = value;
    }
    return [{ _id: ecsRowData._id, _index: ecsRowData._index ?? '', ...fields }];
  }, [ecsRowData._id, ecsRowData._index, flattenedEcsData]);

  const {
    runWorkflowMenuItem: runDocumentWorkflowMenuItem,
    runDocumentWorkflowPanel: runDocumentWorkflowPanels,
  } = useRunDocumentWorkflowPanel({
    closePopover,
    documents: documentForWorkflow,
  });

  const items: AlertTableContextMenuItem[] = useMemo(
    () =>
      !isEvent && ruleId
        ? [
            ...addToCaseActionItems,
            ...statusActionItems,
            ...runWorkflowMenuItem,
            ...alertTagsItems,
            ...alertAssigneesItems,
            ...exceptionActionItems,
            ...(agentId ? osqueryActionItems : []),
          ]
        : [
            ...addToCaseActionItems,
            ...runDocumentWorkflowMenuItem,
            ...(canCreateEndpointEventFilters ? eventFilterActionItems : []),
            ...(agentId ? osqueryActionItems : []),
          ],
    [
      runWorkflowMenuItem,
      runDocumentWorkflowMenuItem,
      isEvent,
      ruleId,
      addToCaseActionItems,
      statusActionItems,
      exceptionActionItems,
      agentId,
      osqueryActionItems,
      eventFilterActionItems,
      canCreateEndpointEventFilters,
      alertTagsItems,
      alertAssigneesItems,
    ]
  );

  const panels = useMemo(
    () => [
      {
        id: 0,
        items,
      },
      ...alertTagsPanels,
      ...alertAssigneesPanels,
      ...statusActionPanels,
      ...runAlertWorkflowPanel,
      ...runDocumentWorkflowPanels,
    ],
    [
      items,
      alertTagsPanels,
      alertAssigneesPanels,
      statusActionPanels,
      runAlertWorkflowPanel,
      runDocumentWorkflowPanels,
    ]
  );

  const button = useMemo(() => {
    const hasItems = !!items.length;
    const tooltipContent = hasItems ? i18n.MORE_ACTIONS : i18n.INSUFFICIENT_PRIVILEGES;

    return (
      <EuiToolTip position="top" content={tooltipContent}>
        <EuiButtonIcon
          aria-label={ariaLabel}
          data-test-subj="timeline-context-menu-button"
          size="s"
          iconType="boxesVertical"
          data-popover-open={isPopoverOpen}
          onClick={onButtonClick}
          isDisabled={disabled || !hasItems}
          color={isPopoverOpen ? 'primary' : 'text'}
        />
      </EuiToolTip>
    );
  }, [ariaLabel, isPopoverOpen, onButtonClick, disabled, items.length]);

  const osqueryFlyout = useMemo(() => {
    return (
      <OsqueryFlyout
        agentId={agentId}
        defaultValues={alertId ? { alertIds: [alertId] } : undefined}
        onClose={handleOnOsqueryClick}
        ecsData={ecsRowData}
      />
    );
  }, [agentId, alertId, ecsRowData, handleOnOsqueryClick]);

  return (
    <>
      <div key="actions-context-menu">
        <EventsTdContent textAlign="center" width={DEFAULT_ACTION_BUTTON_WIDTH}>
          <EuiPopover
            id="singlePanel"
            button={button}
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            panelPaddingSize="none"
            anchorPosition="downLeft"
            repositionOnScroll
          >
            <EuiContextMenu
              size="s"
              initialPanelId={0}
              panels={panels}
              data-test-subj="actions-context-menu"
            />
          </EuiPopover>
        </EventsTdContent>
      </div>
      {isAddEventFilterModalOpen && ecsRowData != null && (
        <EventFiltersFlyout data={ecsRowData} onCancel={closeAddEventFilterModal} />
      )}
      {isOsqueryFlyoutOpen && agentId && ecsRowData != null && osqueryFlyout}
    </>
  );
};

export const AlertContextMenu = React.memo(AlertContextMenuComponent);
