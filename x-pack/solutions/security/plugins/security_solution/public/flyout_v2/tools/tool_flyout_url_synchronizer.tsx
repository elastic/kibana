/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useState } from 'react';
import { useStore } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { useKibana } from '../../common/lib/kibana';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { defaultToolsFlyoutProperties } from '../shared/hooks/use_default_flyout_properties';
import { openToolFlyout, getActiveToolFlyoutRef } from './open_tool_flyout';
import { clearToolFlyoutUrlState, getToolFlyoutUrlState } from './url_state';
import { RestoredToolFlyoutContent } from './tool_flyout_registry';
import { alertFlyoutHistoryKey } from '../document/constants/flyout_history';

/**
 * Synchronizes URL-backed tool flyout state with the system flyout overlay.
 * Mounted once at app level to restore the latest (top-most) tool flyout after refresh.
 */
export const ToolFlyoutUrlSynchronizer = memo(() => {
  const { services } = useKibana();
  const { overlays } = services;
  const store = useStore();
  const history = useHistory();
  const newFlyoutSystemEnabled = useIsExperimentalFeatureEnabled('newFlyoutSystemEnabled');
  const [urlState, setUrlState] = useState(() => getToolFlyoutUrlState(history));
  const { isOpen, state } = urlState;

  useEffect(() => {
    const unlisten = history.listen(() => {
      setUrlState(getToolFlyoutUrlState(history));
    });

    return () => unlisten();
  }, [history]);

  useEffect(() => {
    if (!newFlyoutSystemEnabled) {
      return;
    }

    if (!isOpen) {
      return;
    }

    if (state && !getActiveToolFlyoutRef()) {
      openToolFlyout({
        overlays,
        services,
        store,
        history,
        content: <RestoredToolFlyoutContent state={state} />,
        defaultFlyoutProperties: defaultToolsFlyoutProperties,
        persistedState: state,
        historyKey: alertFlyoutHistoryKey,
        session: 'start',
        persistToUrl: false,
        clearUrlOnClose: true,
      });
    } else if (!state) {
      clearToolFlyoutUrlState(history);
    }
  }, [history, isOpen, newFlyoutSystemEnabled, overlays, services, state, store]);

  return null;
});

ToolFlyoutUrlSynchronizer.displayName = 'ToolFlyoutUrlSynchronizer';
