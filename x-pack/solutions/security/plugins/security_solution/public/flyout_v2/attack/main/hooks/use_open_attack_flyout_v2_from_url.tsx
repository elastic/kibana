/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { useStore } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { useKibana } from '../../../../common/lib/kibana';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { flyoutProviders } from '../../../shared/components/flyout_provider';
import { useDefaultDocumentFlyoutProperties } from '../../../shared/hooks/use_default_flyout_properties';
import { documentFlyoutHistoryKey } from '../../../shared/constants/flyout_history';
import { AttackFlyoutWrapper } from '../attack_flyout_wrapper';
import {
  ATTACK_FLYOUT_V2_URL_PARAM,
  decodeAttackFlyoutV2UrlParam,
} from '../utils/attack_flyout_v2_url_param';

export interface UseOpenAttackFlyoutV2FromUrlProps {
  /**
   * Callback invoked after attack mutations to refresh related views.
   */
  onAttackUpdated: () => void;
}

/**
 * Reads the `attackFlyoutV2` URL parameter on mount and opens the v2 attack flyout
 * via `overlays.openSystemFlyout`. The URL parameter is consumed (removed from history)
 * so the flyout only auto-opens once per navigation.
 *
 * No-op when the new flyout system experimental flag is disabled, so the legacy
 * URL-driven flyout state continues to work for users on the legacy system.
 */
export const useOpenAttackFlyoutV2FromUrl = ({
  onAttackUpdated,
}: UseOpenAttackFlyoutV2FromUrlProps): void => {
  const { services } = useKibana();
  const { overlays } = services;
  const newFlyoutSystemEnabled = useIsExperimentalFeatureEnabled('newFlyoutSystemEnabled');
  const defaultFlyoutProperties = useDefaultDocumentFlyoutProperties();
  const store = useStore();
  const history = useHistory();
  const { search } = useLocation();

  const hasOpenedRef = useRef(false);

  useEffect(() => {
    if (!newFlyoutSystemEnabled || hasOpenedRef.current) return;

    const searchParams = new URLSearchParams(search);
    const raw = searchParams.get(ATTACK_FLYOUT_V2_URL_PARAM);
    const decoded = decodeAttackFlyoutV2UrlParam(raw);
    if (!decoded) return;

    hasOpenedRef.current = true;

    overlays.openSystemFlyout(
      flyoutProviders({
        services,
        store,
        history,
        children: (
          <AttackFlyoutWrapper
            attackId={decoded.attackId}
            indexName={decoded.indexName}
            onAttackUpdated={onAttackUpdated}
          />
        ),
      }),
      {
        ...defaultFlyoutProperties,
        historyKey: documentFlyoutHistoryKey,
        session: 'start',
      }
    );

    searchParams.delete(ATTACK_FLYOUT_V2_URL_PARAM);
    const nextSearch = searchParams.toString();
    history.replace({ search: nextSearch ? `?${nextSearch}` : '' });
  }, [
    defaultFlyoutProperties,
    history,
    newFlyoutSystemEnabled,
    onAttackUpdated,
    overlays,
    search,
    services,
    store,
  ]);
};
