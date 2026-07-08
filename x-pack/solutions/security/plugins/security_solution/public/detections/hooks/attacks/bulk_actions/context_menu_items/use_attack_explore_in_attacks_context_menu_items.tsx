/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiContextMenuPanelItemDescriptorEntry } from '@elastic/eui/src/components/context_menu/context_menu';
import { EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';

import { useKibana } from '../../../../../common/lib/kibana';
import { useIsNewFlyoutEnabled } from '../../../../../common/hooks/use_is_new_flyout_enabled';
import { buildExploreInAttacksUrl } from '../../../../../flyout_v2/attack/main/utils/get_explore_in_attacks_url';

export const EXPLORE_IN_ATTACKS_TEST_ID = 'exploreInAttacksContextMenuItem';
export const EXPLORE_IN_ATTACKS_LABEL = i18n.translate(
  'xpack.securitySolution.attacks.exploreInAttacks',
  { defaultMessage: 'Explore in Attacks' }
);

export interface UseAttackExploreInAttacksContextMenuItemsProps {
  /** The attack discovery object */
  attack: AttackDiscoveryAlert;
  /** Optional callback to close the containing popover menu */
  closePopover?: () => void;
}

/**
 * Returns a context menu item that opens the attack in the Attacks app in a new tab.
 * Intended to replace the "Investigate in Timeline" item when the flyout is opened
 * from a context outside the Security Solution app (e.g. Discover).
 */
export const useAttackExploreInAttacksContextMenuItems = ({
  attack,
  closePopover,
}: UseAttackExploreInAttacksContextMenuItemsProps): {
  items: EuiContextMenuPanelItemDescriptorEntry[];
} => {
  const {
    services: { application },
  } = useKibana();
  const newFlyoutSystemEnabled = useIsNewFlyoutEnabled();

  const url = useMemo(() => {
    const attacksBaseURL = application.getUrlForApp('securitySolutionUI', { path: 'attacks' });
    return buildExploreInAttacksUrl({
      attackId: attack.id,
      indexName: attack.index ?? '',
      timestamp: attack.timestamp,
      attacksBaseURL,
      useFlyoutV2: newFlyoutSystemEnabled,
    });
  }, [application, attack.id, attack.index, attack.timestamp, newFlyoutSystemEnabled]);

  const onClick = useCallback(() => {
    closePopover?.();
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [closePopover, url]);

  const items = useMemo<EuiContextMenuPanelItemDescriptorEntry[]>(
    () => [
      {
        'data-test-subj': EXPLORE_IN_ATTACKS_TEST_ID,
        key: 'exploreInAttacks',
        name: (
          <EuiFlexGroup alignItems="center" gutterSize="xs" justifyContent="flexStart">
            <EuiFlexItem grow={false}>{EXPLORE_IN_ATTACKS_LABEL}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIcon type="external" size="m" aria-hidden={true} />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        onClick,
      },
    ],
    [onClick]
  );

  return { items };
};
