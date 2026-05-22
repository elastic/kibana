/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { AttackDetails } from '../../../flyout_v2/attack_details/main';
import { cellActionRenderer } from '../../../flyout_v2/shared/components/cell_actions';
import { FlyoutLoading } from '../../../flyout_v2/shared/components/flyout_loading';
import { FlyoutError } from '../../../flyout_v2/shared/components/flyout_error';
import { AttackDetailsLeftPanelKey, AttackDetailsRightPanelKey } from '../constants/panel_keys';
import { NOTES_TAB_ID } from '../constants/left_panel_paths';
import { useAttackHit } from '../hooks/use_attack_hit';
import { useNavigateToAttackDetailsLeftPanel } from '../hooks/use_navigate_to_attack_details_left_panel';
import type { AttackDetailsProps } from '../types';

/**
 * Panel rendered in the legacy expandable-flyout preview section. Thin
 * wrapper: fetches the attack document with {@link useAttackHit} and
 * delegates to the v2 {@link AttackDetails} component. Mirrors
 * {@link AttackDetailsRightPanel} minus the {@link FlyoutNavigation} (the
 * preview surface has no expand chevron). The yellow preview banner is
 * applied by the expandable-flyout itself via the `banner` panel config
 * (see `flyout/attack_details/constants/preview_banner.ts`).
 *
 * From preview mode, opening notes / entities / correlations uses
 * `openFlyout({ right, left })` (via {@link useNavigateToAttackDetailsLeftPanel}
 * with `isPreviewMode: true`) so the left panel opens with the right panel
 * restored alongside it instead of replacing the preview.
 */
export const AttackDetailsPreviewPanel: React.FC<Partial<AttackDetailsProps>> = memo(
  ({ params }) => {
    const attackId = params?.attackId ?? '';
    const indexName = params?.indexName ?? '';
    const { openFlyout } = useExpandableFlyoutApi();
    const { hit, loading, refetch } = useAttackHit(attackId, indexName);

    const onShowAttackEntities = useNavigateToAttackDetailsLeftPanel({
      attackId,
      indexName,
      isPreviewMode: true,
      subTab: 'entity',
    });
    const onShowAttackCorrelations = useNavigateToAttackDetailsLeftPanel({
      attackId,
      indexName,
      isPreviewMode: true,
      subTab: 'correlation',
    });
    const onShowNotes = useCallback(
      () =>
        openFlyout({
          right: { id: AttackDetailsRightPanelKey, params: { attackId, indexName } },
          left: {
            id: AttackDetailsLeftPanelKey,
            params: { attackId, indexName },
            path: { tab: NOTES_TAB_ID },
          },
        }),
      [attackId, indexName, openFlyout]
    );

    if (loading) return <FlyoutLoading />;
    if (!hit) return <FlyoutError />;

    return (
      <AttackDetails
        hit={hit}
        onShowNotes={onShowNotes}
        onShowAttackEntities={onShowAttackEntities}
        onShowAttackCorrelations={onShowAttackCorrelations}
        renderCellActions={cellActionRenderer}
        onAlertUpdated={refetch}
        padded
      />
    );
  }
);

AttackDetailsPreviewPanel.displayName = 'AttackDetailsPreviewPanel';
