/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common';
import { TableId } from '@kbn/securitysolution-data-table';
import { useRiskInputActions } from './use_risk_input_actions';
import type { InputAlert } from '../../../hooks/use_risk_contributing_alerts';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useSendBulkToTimeline } from '../../../../detections/components/alerts_table/timeline_actions/use_send_bulk_to_timeline';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { EntityEventTypes } from '../../../../common/lib/telemetry';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { useIsInSecurityApp } from '../../../../common/hooks/is_in_security_app';

export const useRiskInputActionsPanels = (inputs: InputAlert[], closePopover: () => void) => {
  const { cases: casesService, telemetry } = useKibana().services;
  const { addToExistingCase, addToNewCaseClick } = useRiskInputActions(inputs, closePopover);
  const { from, to } = useGlobalTime();
  const {
    timelinePrivileges: { read: canReadTimelines },
  } = useUserPrivileges();
  const isInSecurityApp = useIsInSecurityApp();
  const userCasesPermissions = casesService?.helpers.canUseCases([SECURITY_SOLUTION_OWNER]);
  const hasCasesPermissions = userCasesPermissions?.create && userCasesPermissions?.read;

  const { sendBulkEventsToTimelineHandler } = useSendBulkToTimeline({
    to,
    from,
    tableId: TableId.riskInputs,
  });
  const timelineActions = useMemo(() => {
    if (!canReadTimelines || !isInSecurityApp) {
      return [];
    }

    return [
      {
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.actions.investigateInTimeline"
            defaultMessage="Investigate in Timeline"
          />
        ),

        onClick: () => {
          telemetry.reportEvent(EntityEventTypes.AddRiskInputToTimelineClicked, {
            quantity: inputs.length,
          });

          closePopover();
          const items = inputs.map(({ input }: InputAlert) => {
            return {
              _id: input.id,
              _index: input.index,
              data: [],
              ecs: {
                _id: input.id,
                _index: input.index,
              },
            };
          });
          sendBulkEventsToTimelineHandler(items);
        },
      },
    ];
  }, [
    canReadTimelines,
    isInSecurityApp,
    inputs,
    sendBulkEventsToTimelineHandler,
    closePopover,
    telemetry,
  ]);

  return useMemo(
    () => [
      {
        id: 0,
        items: [
          ...timelineActions,
          ...(hasCasesPermissions
            ? [
                {
                  name: (
                    <FormattedMessage
                      id="xpack.securitySolution.flyout.entityDetails.riskInputs.actions.addToNewCase"
                      defaultMessage="Add to new case"
                    />
                  ),

                  onClick: addToNewCaseClick,
                },

                {
                  name: (
                    <FormattedMessage
                      id="xpack.securitySolution.flyout.entityDetails.riskInputs.actions.addToExistingCase"
                      defaultMessage="Add to existing case"
                    />
                  ),

                  onClick: addToExistingCase,
                },
              ]
            : []),
        ],
      },
    ],
    [addToExistingCase, addToNewCaseClick, hasCasesPermissions, timelineActions]
  );
};
