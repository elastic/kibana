/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { BulkActionsConfig } from '@kbn/response-ops-alerts-table/types';
import { useAddToExistingCase } from '../../../../../attack_discovery/pages/results/take_action/use_add_to_existing_case';
import { useAddToNewCase } from '../../../../../attack_discovery/pages/results/take_action/use_add_to_case';
import { APP_ID } from '../../../../../../common';
import { useKibana } from '../../../../../common/lib/kibana';
import { ADD_TO_EXISTING_CASE, ADD_TO_NEW_CASE } from '../translations';
import { ALERT_ATTACK_DISCOVERY_MARKDOWN_COMMENT } from '../constants';
import type { BulkAttackActionItems } from '../types';
import { extractRelatedDetectionAlertIds } from '../utils/extract_related_detection_alert_ids';

export interface UseBulkAttackCaseItemsProps {
  /** Title used to initialize "create case" flyout */
  title: string;
  /** Optional callback when add-to-case action is triggered */
  onCasesAdd?: () => void;
  /** Optional callback to close the popover after triggering action */
  closePopover?: () => void;
}

/**
 * Hook that provides bulk action items for adding attacks to a new or existing case.
 */
export const useBulkAttackCaseItems = ({
  title,
  onCasesAdd,
  closePopover,
}: UseBulkAttackCaseItemsProps): BulkAttackActionItems => {
  const {
    services: { cases },
  } = useKibana();
  const userCasesPermissions = cases.helpers.canUseCases([APP_ID]);
  const canCreateAndReadCases = userCasesPermissions.createComment && userCasesPermissions.read;
  const canUserCreateAndReadCases = useCallback(
    () => canCreateAndReadCases,
    [canCreateAndReadCases]
  );

  const { onAddToNewCase, disabled: isAddToNewCaseDisabled } = useAddToNewCase({
    canUserCreateAndReadCases,
    title,
    onClick: onCasesAdd,
  });

  const { onAddToExistingCase, disabled: isAddToExistingCaseDisabled } = useAddToExistingCase({
    canUserCreateAndReadCases,
    onClick: onCasesAdd,
  });

  const onAddToNewCaseClick = useCallback<Required<BulkActionsConfig>['onClick']>(
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

      onAddToNewCase({ alertIds, markdownComments });
      closePopover?.();
    },
    [closePopover, onAddToNewCase]
  );

  const onAddToExistingCaseClick = useCallback<Required<BulkActionsConfig>['onClick']>(
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

      onAddToExistingCase({ alertIds, markdownComments });
      closePopover?.();
    },
    [closePopover, onAddToExistingCase]
  );

  const items = useMemo<BulkActionsConfig[]>(
    () =>
      canCreateAndReadCases
        ? [
            {
              name: ADD_TO_NEW_CASE,
              label: ADD_TO_NEW_CASE,
              key: 'attack-add-to-new-case',
              'data-test-subj': 'attack-add-to-new-case',
              disableOnQuery: true,
              disable: isAddToNewCaseDisabled,
              onClick: onAddToNewCaseClick,
            },
            {
              name: ADD_TO_EXISTING_CASE,
              label: ADD_TO_EXISTING_CASE,
              key: 'attack-add-to-existing-case',
              'data-test-subj': 'attack-add-to-existing-case',
              disableOnQuery: true,
              disable: isAddToExistingCaseDisabled,
              onClick: onAddToExistingCaseClick,
            },
          ]
        : [],
    [
      canCreateAndReadCases,
      isAddToExistingCaseDisabled,
      isAddToNewCaseDisabled,
      onAddToExistingCaseClick,
      onAddToNewCaseClick,
    ]
  );

  return useMemo(
    () => ({
      items,
      panels: [],
    }),
    [items]
  );
};
