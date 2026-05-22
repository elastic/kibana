/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { getFieldValue } from '@kbn/discover-utils';
import { AttackDetails } from '../../flyout_v2/attack_details/main';
import { cellActionRenderer } from '../../flyout_v2/shared/components/cell_actions';
import { FlyoutLoading } from '../../flyout_v2/shared/components/flyout_loading';
import { FlyoutError } from '../../flyout_v2/shared/components/flyout_error';
import { FlyoutNavigation } from '../shared/components/flyout_navigation';
import { ShareUrlIconButton } from '../shared/components/share_url_icon_button';
import { AttackDetailsLeftPanelKey } from './constants/panel_keys';
import { NOTES_TAB_ID } from './constants/left_panel_paths';
import { useAttackHit } from './hooks/use_attack_hit';
import { useGetAttackFlyoutLink } from './hooks/use_get_attack_flyout_link';
import { useNavigateToAttackDetailsLeftPanel } from './hooks/use_navigate_to_attack_details_left_panel';
import type { AttackDetailsProps } from './types';

export { AttackDetailsPreviewPanel } from './preview';
export { ATTACK_PREVIEW_BANNER } from './constants/preview_banner';

const SHARE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.attackDetailsFlyout.header.shareButtonToolTip',
  { defaultMessage: 'Share attack' }
);

/**
 * Panel rendered in the legacy expandable-flyout right section. This is a
 * thin wrapper: it fetches the attack document with {@link useAttackHit},
 * wires the legacy expand chevron + share button, and delegates the actual
 * UI to the v2 {@link AttackDetails} component.
 */
export const AttackDetailsRightPanel: React.FC<Partial<AttackDetailsProps>> = memo(({ params }) => {
  const attackId = params?.attackId ?? '';
  const indexName = params?.indexName ?? '';
  const { openLeftPanel } = useExpandableFlyoutApi();
  const { hit, loading, refetch } = useAttackHit(attackId, indexName);

  const expandDetails = useNavigateToAttackDetailsLeftPanel({ attackId, indexName });
  const onShowAttackEntities = useNavigateToAttackDetailsLeftPanel({
    attackId,
    indexName,
    subTab: 'entity',
  });
  const onShowAttackCorrelations = useNavigateToAttackDetailsLeftPanel({
    attackId,
    indexName,
    subTab: 'correlation',
  });
  const onShowNotes = useCallback(
    () =>
      openLeftPanel({
        id: AttackDetailsLeftPanelKey,
        params: { attackId, indexName },
        path: { tab: NOTES_TAB_ID },
      }),
    [attackId, indexName, openLeftPanel]
  );

  const timestamp = hit ? (getFieldValue(hit, '@timestamp') as string | undefined) : undefined;
  const attackDetailsLink = useGetAttackFlyoutLink({ attackId, indexName, timestamp });

  const actions = useMemo(
    () => (
      <ShareUrlIconButton
        url={attackDetailsLink}
        tooltip={SHARE_TOOLTIP}
        ariaLabel={SHARE_TOOLTIP}
        dataTestSubj="attack-details-flyout-header-share-button"
      />
    ),
    [attackDetailsLink]
  );

  if (loading) return <FlyoutLoading />;
  if (!hit) return <FlyoutError />;

  return (
    <>
      <FlyoutNavigation flyoutIsExpandable={true} expandDetails={expandDetails} actions={actions} />
      <AttackDetails
        hit={hit}
        onShowNotes={onShowNotes}
        onShowAttackEntities={onShowAttackEntities}
        onShowAttackCorrelations={onShowAttackCorrelations}
        renderCellActions={cellActionRenderer}
        onAlertUpdated={refetch}
        padded
      />
    </>
  );
});

AttackDetailsRightPanel.displayName = 'AttackDetailsRightPanel';
