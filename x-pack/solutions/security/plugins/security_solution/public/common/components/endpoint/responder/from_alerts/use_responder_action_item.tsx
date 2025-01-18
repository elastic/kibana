/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { useAlertResponseActionsSupport } from '../../../../hooks/endpoint/use_alert_response_actions_support';
import { useUserPrivileges } from '../../../user_privileges';
import type { AlertTableContextMenuItem } from '../../../../../detections/components/alerts_table/types';
import { useWithResponderActionDataFromAlert } from './use_responder_action_data';

export const useResponderActionItem = (
  eventDetailsData: TimelineEventsDetailsItem[] | null,
  onClick: () => void
): AlertTableContextMenuItem[] => {
  const { loading: isAuthzLoading, canAccessResponseConsole } =
    useUserPrivileges().endpointPrivileges;
  const { isAlert } = useAlertResponseActionsSupport(eventDetailsData);
  const { handleResponseActionsClick, isDisabled, tooltip } = useWithResponderActionDataFromAlert({
    onClick,
    eventData: eventDetailsData,
  });

  return useMemo(() => {
    const actions: AlertTableContextMenuItem[] = [];

    if (!isAuthzLoading && canAccessResponseConsole && isAlert) {
      actions.push({
        key: 'endpointResponseActions-action-item',
        'data-test-subj': 'endpointResponseActions-action-item',
        disabled: isDisabled,
        toolTipContent: tooltip,
        size: 's',
        onClick: handleResponseActionsClick,
        name: (
          <FormattedMessage
            id="xpack.securitySolution.endpoint.detections.takeAction.responseActionConsole.buttonLabel"
            defaultMessage="Respond"
          />
        ),
      });
    }

    return actions;
  }, [
    canAccessResponseConsole,
    handleResponseActionsClick,
    isAlert,
    isAuthzLoading,
    isDisabled,
    tooltip,
  ]);
};
