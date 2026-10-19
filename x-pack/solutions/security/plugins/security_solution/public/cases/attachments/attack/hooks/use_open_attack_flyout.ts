/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { toReadableAttackIndexPattern } from '@kbn/elastic-assistant-common';
import { AttackDetailsRightPanelKey } from '../../../../flyout/attack_details/constants/panel_keys';
import { FLYOUT_ORIGIN } from '../../../../common/lib/telemetry';
import { useIsNewFlyoutEnabled } from '../../../../common/hooks/use_is_new_flyout_enabled';
import { useFlyoutApi } from '../../../../flyout_v2/use_flyout_api';

export interface UseOpenAttackFlyoutParams {
  /** The attack document `_id`. */
  attackId: string;
  /** The index the attack lives in, taken from the attachment metadata. */
  indexName: string;
  /** The attack title, used to label the flyout history entry. */
  attackTitle?: string;
}

/** Opens the attack flyout on an attached attack, in either the new or the legacy flyout. */
export const useOpenAttackFlyout = ({
  attackId,
  indexName,
  attackTitle,
}: UseOpenAttackFlyoutParams): (() => void) => {
  const enableNewFlyout = useIsNewFlyoutEnabled();
  const { openAttackFlyout } = useFlyoutApi();
  const { openFlyout } = useExpandableFlyoutApi();

  // The snapshotted backing index is not readable by most users; see `toReadableAttackIndexPattern`.
  const flyoutIndexName = useMemo(() => toReadableAttackIndexPattern(indexName), [indexName]);

  return useCallback(() => {
    if (enableNewFlyout) {
      openAttackFlyout({
        attackId,
        indexName: flyoutIndexName,
        attackTitle,
        origin: FLYOUT_ORIGIN.CASE_ATTACHMENT,
      });
      return;
    }

    // No telemetry: the new flyout reports it internally and the legacy path is deprecated.
    openFlyout({
      right: {
        id: AttackDetailsRightPanelKey,
        params: { attackId, indexName: flyoutIndexName },
      },
    });
  }, [attackId, attackTitle, enableNewFlyout, flyoutIndexName, openAttackFlyout, openFlyout]);
};
