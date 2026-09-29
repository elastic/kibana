/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ADD_TO_CASE } from '@kbn/response-ops-alerts-table';
import type { BulkActionsConfig } from '@kbn/response-ops-alerts-table/types';
import { useCallback, useMemo } from 'react';
import { useAssistantContext } from '@kbn/elastic-assistant';

import { useAddToCase } from '../../../../../attack_discovery/pages/results/take_action/use_add_to_case';
import { APP_ID } from '../../../../../../common';
import { useKibana } from '../../../../../common/lib/kibana';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { AttacksEventTypes } from '../../../../../common/lib/telemetry';
import type { AttacksActionTelemetrySource } from '../../../../../common/lib/telemetry';
import { ATTACK_ADD_TO_CASE_ACTION_ID } from '../../../../../common/constants/action_ids';
import type { AttackToAttach } from '../../../../../cases/attachments/attack';
import { buildAttackAttachments } from '../../../../../cases/attachments/attack';
import { ATTACK_ALERTS_TRUNCATED } from '../translations';
import { ALERT_ATTACK_DISCOVERY_MARKDOWN_COMMENT } from '../constants';
import type { BulkAttackActionItems } from '../types';
import { extractRelatedDetectionAlertIds } from '../utils/extract_related_detection_alert_ids';

export interface UseBulkAttackCaseItemsProps {
  /** Title used to initialize the create-case flyout */
  title: string;
  /** Optional callback when add-to-case action is triggered */
  onCasesAdd?: () => void;
  /** Optional callback to close the popover after triggering action */
  closePopover?: () => void;
  /** Source of the action for telemetry */
  telemetrySource?: AttacksActionTelemetrySource;
  /**
   * The single attack being attached. With `attackAttachmentsEnabled` on it is posted as a
   * `security.attack` attachment plus its constituent alerts instead of a markdown comment.
   */
  attackToAttach?: Omit<AttackToAttach, 'alertsIndex'>;
}

/**
 * Hook that provides a bulk action item for adding attacks to a case.
 */
export const useBulkAttackCaseItems = ({
  title,
  onCasesAdd,
  closePopover,
  telemetrySource,
  attackToAttach,
}: UseBulkAttackCaseItemsProps): BulkAttackActionItems => {
  const {
    services: { cases, telemetry },
  } = useKibana();
  const { alertsIndexPattern } = useAssistantContext();
  const { addWarning } = useAppToasts();
  const attackAttachmentsEnabled = useIsExperimentalFeatureEnabled('attackAttachmentsEnabled');
  // The attack type is unified-only, so fall back to the markdown payload when the framework is off.
  const canAttachAttack =
    attackAttachmentsEnabled && cases.config.attachmentsEnabled && attackToAttach != null;
  const userCasesPermissions = cases.helpers.canUseCases([APP_ID]);
  const canCreateAndReadCases = userCasesPermissions.createComment && userCasesPermissions.read;
  const canUserCreateAndReadCases = useCallback(
    () => canCreateAndReadCases,
    [canCreateAndReadCases]
  );

  const onAddToCaseSuccess = useCallback(
    (isNewCase: boolean) => {
      if (telemetrySource) {
        telemetry.reportEvent(AttacksEventTypes.ActionAddedToCase, {
          source: telemetrySource,
          action: isNewCase ? 'add_to_new_case' : 'add_to_existing_case',
        });
      }
    },
    [telemetry, telemetrySource]
  );

  const { onAddToCase, disabled } = useAddToCase({
    canUserCreateAndReadCases,
    onClick: onCasesAdd,
    onSuccess: onAddToCaseSuccess,
    title,
  });

  const attackAttachments = useMemo(() => {
    if (!canAttachAttack || attackToAttach == null) {
      return undefined;
    }

    return buildAttackAttachments({
      ...attackToAttach,
      alertsIndex: alertsIndexPattern ?? '',
    });
  }, [alertsIndexPattern, attackToAttach, canAttachAttack]);

  const onAddToCaseClick = useCallback<Required<BulkActionsConfig>['onClick']>(
    async (alertItems) => {
      const alertIds = extractRelatedDetectionAlertIds(alertItems);
      const markdownComments = alertItems
        .map((item) => {
          const value = item.data.find(
            (data) => data.field === ALERT_ATTACK_DISCOVERY_MARKDOWN_COMMENT
          )?.value;
          if (!Array.isArray(value)) {
            return undefined;
          }
          return typeof value[0] === 'string' ? value[0] : undefined;
        })
        .filter((comment): comment is string => comment != null);

      if (attackAttachments == null) {
        onAddToCase({ alertIds, markdownComments });
      } else {
        onAddToCase({
          alertIds: [],
          markdownComments: [],
          attachments: attackAttachments.attachments,
        });
        if (attackAttachments.truncated) {
          addWarning({
            title: ATTACK_ALERTS_TRUNCATED({
              alertCount: attackAttachments.alertCount,
              attachedAlertCount: attackAttachments.attachedAlertCount,
            }),
          });
        }
      }

      closePopover?.();
    },
    [addWarning, attackAttachments, closePopover, onAddToCase]
  );

  const items = useMemo<BulkActionsConfig[]>(
    () =>
      canCreateAndReadCases
        ? [
            {
              name: ADD_TO_CASE,
              label: ADD_TO_CASE,
              key: ATTACK_ADD_TO_CASE_ACTION_ID,
              'data-test-subj': ATTACK_ADD_TO_CASE_ACTION_ID,
              disableOnQuery: true,
              disable: disabled,
              groupId: 'cases',
              icon: 'briefcase',
              onClick: onAddToCaseClick,
            },
          ]
        : [],
    [canCreateAndReadCases, disabled, onAddToCaseClick]
  );

  return useMemo(() => ({ items, panels: [] }), [items]);
};
