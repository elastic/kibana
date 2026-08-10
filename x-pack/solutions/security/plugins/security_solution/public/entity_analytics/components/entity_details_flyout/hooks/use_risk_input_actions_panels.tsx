/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiTextTruncate } from '@elastic/eui';
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common';
import { TableId } from '@kbn/securitysolution-data-table';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash/fp';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { useRiskInputActions } from './use_risk_input_actions';
import type { InputAlert } from '../../../hooks/use_risk_contributing_alerts';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useSendBulkToTimeline } from '../../../../detections/components/alerts_table/timeline_actions/use_send_bulk_to_timeline';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { EntityEventTypes } from '../../../../common/lib/telemetry';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { useIsInSecurityApp } from '../../../../common/hooks/is_in_security_app';
import {
  composeSecurityActionMenu,
  type SecurityActionMenuActionId,
  type SecurityActionMenuContribution,
} from '../../../../common/components/security_action_menu';
import {
  RISK_INPUT_ACTION_IDS,
  ENTITY_DETAILS_FLYOUT_RISK_INPUT_ACTION_MENU_PRESET,
  type RiskInputActionId,
} from './action_menu/definitions';

export interface UseRiskInputActionsPanelsOptions {
  customActions?: readonly SecurityActionMenuContribution[];
  actionOrder?: readonly SecurityActionMenuActionId[];
}

export const useRiskInputActionsPanels = (
  inputs: InputAlert[],
  closePopover: () => void,
  { customActions, actionOrder }: UseRiskInputActionsPanelsOptions = {}
): EuiContextMenuPanelDescriptor[] => {
  const { cases: casesService, telemetry } = useKibana().services;
  const { addToExistingCase, addToNewCaseClick } = useRiskInputActions(inputs);
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
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.actions.addToNewTimeline"
            defaultMessage="Add to new timeline"
          />
        ),

        onClick: () => {
          telemetry.reportEvent(EntityEventTypes.AddRiskInputToTimelineClicked, {
            quantity: inputs.length,
          });

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
  }, [canReadTimelines, isInSecurityApp, inputs, sendBulkEventsToTimelineHandler, telemetry]);

  const casesActions = useMemo(
    () =>
      hasCasesPermissions
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
        : [],
    [addToExistingCase, addToNewCaseClick, hasCasesPermissions]
  );
  const contributions: Array<SecurityActionMenuContribution<RiskInputActionId>> = useMemo(
    () => [
      {
        id: RISK_INPUT_ACTION_IDS.addToNewTimeline,
        items: timelineActions,
      },
      {
        id: RISK_INPUT_ACTION_IDS.addToCase,
        items: casesActions,
      },
    ],
    [casesActions, timelineActions]
  );
  const { panels } = composeSecurityActionMenu({
    preset: ENTITY_DETAILS_FLYOUT_RISK_INPUT_ACTION_MENU_PRESET,
    contributions,
    customActions,
    actionOrder,
    closeMenu: closePopover,
  });
  const title = useMemo(() => {
    const ruleName = get(['alert', ALERT_RULE_NAME], inputs[0]) ?? '';
    const panelTitle = i18n.translate(
      'xpack.securitySolution.flyout.entityDetails.riskInputs.actions.title',
      {
        defaultMessage: 'Risk input: {description}',
        values: {
          description:
            inputs.length === 1
              ? ruleName
              : i18n.translate(
                  'xpack.securitySolution.flyout.entityDetails.riskInputs.actions.titleDescription',
                  {
                    defaultMessage: '{quantity} selected',
                    values: {
                      quantity: inputs.length,
                    },
                  }
                ),
        },
      }
    );

    return (
      <EuiTextTruncate
        width={230} // It prevents the title from taking too much space
        text={panelTitle}
      />
    );
  }, [inputs]);

  return useMemo(
    () => panels.map((panel) => (panel.id === 0 ? { ...panel, title } : panel)),
    [panels, title]
  );
};
