/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelItemDescriptorEntry } from '@elastic/eui/src/components/context_menu/context_menu';
import {
  getAttackDiscoveryMarkdown,
  type AttackDiscoveryAlert,
} from '@kbn/elastic-assistant-common';
import { useCallback, useMemo } from 'react';
import { useAddToExistingCase } from '../../../../../attack_discovery/pages/results/take_action/use_add_to_existing_case';
import { APP_ID } from '../../../../../../common';
import { useKibana } from '../../../../../common/lib/kibana';
import {
  ADD_TO_EXISTING_CASE,
  ADD_TO_NEW_CASE,
} from '../../../../../common/components/visualization_actions/translations';
import { useAddToNewCase } from '../../../../../attack_discovery/pages/results/take_action/use_add_to_case';

interface UseAttackCaseContextMenuItemsProps {
  attack: AttackDiscoveryAlert;
  closePopover?: () => void;
}

export const useAttackCaseContextMenuItems = ({
  attack,
  closePopover,
}: UseAttackCaseContextMenuItemsProps): {
  items: EuiContextMenuPanelItemDescriptorEntry[];
} => {
  const {
    services: { cases },
  } = useKibana();
  const userCasesPermissions = cases.helpers.canUseCases([APP_ID]);
  const canCreateAndReadCases = userCasesPermissions.createComment && userCasesPermissions.read;
  const canUserCreateAndReadCases = useCallback(() => canCreateAndReadCases, [canCreateAndReadCases]);

  const { onAddToNewCase, disabled: isAddToNewCaseDisabled } = useAddToNewCase({
    canUserCreateAndReadCases,
    title: attack.title,
  });

  const { onAddToExistingCase, disabled: isAddToExistingCaseDisabled } = useAddToExistingCase({
    canUserCreateAndReadCases,
  });

  const markdownComment = useMemo(
    () =>
      getAttackDiscoveryMarkdown({
        attackDiscovery: attack,
        replacements: attack.replacements,
      }),
    [attack]
  );

  const onAddToNewCaseClick = useCallback(() => {
    closePopover?.();
    onAddToNewCase({
      alertIds: attack.alertIds,
      replacements: attack.replacements,
      markdownComments: [markdownComment],
    });
  }, [attack.alertIds, attack.replacements, closePopover, markdownComment, onAddToNewCase]);

  const onAddToExistingCaseClick = useCallback(() => {
    closePopover?.();
    onAddToExistingCase({
      alertIds: attack.alertIds,
      replacements: attack.replacements,
      markdownComments: [markdownComment],
    });
  }, [attack.alertIds, attack.replacements, closePopover, markdownComment, onAddToExistingCase]);

  const items = useMemo<EuiContextMenuPanelItemDescriptorEntry[]>(
    () =>
      canCreateAndReadCases
        ? [
            {
              name: ADD_TO_NEW_CASE,
              key: 'attack-add-to-new-case',
              'data-test-subj': 'attack-add-to-new-case',
              disabled: isAddToNewCaseDisabled,
              onClick: onAddToNewCaseClick,
            },
            {
              name: ADD_TO_EXISTING_CASE,
              key: 'attack-add-to-existing-case',
              'data-test-subj': 'attack-add-to-existing-case',
              disabled: isAddToExistingCaseDisabled,
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

  return { items };
};
