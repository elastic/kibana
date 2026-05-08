/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { useCallback } from 'react';
import { useStore } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { useKibana } from '../../../common/lib/kibana';
import { useIsInSecurityApp } from '../../../common/hooks/is_in_security_app';
import { documentFlyoutHistoryKey } from '../constants/flyout_history';
import { flyoutProviders } from '../components/flyout_provider';
import { defaultToolsFlyoutProperties } from './use_default_flyout_properties';

/**
 * Returns a callback that opens a tools flyout (entity details, prevalence, correlations, etc.)
 * inside the current overlay stack with the standard providers and properties.
 */
export const useOpenToolsFlyout = () => {
  const { services } = useKibana();
  const { overlays } = services;
  const store = useStore();
  const history = useHistory();
  const isInSecurityApp = useIsInSecurityApp();
  const historyKey = isInSecurityApp ? documentFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY;

  return useCallback(
    (children: React.ReactNode) =>
      overlays.openSystemFlyout(flyoutProviders({ services, store, history, children }), {
        ...defaultToolsFlyoutProperties,
        historyKey,
        session: 'start',
      }),
    [history, historyKey, overlays, services, store]
  );
};
