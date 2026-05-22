/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CellActionsProvider } from '@kbn/cell-actions';
import { ExpandableFlyoutProvider } from '@kbn/expandable-flyout';
import { NavigationProvider } from '@kbn/security-solution-navigation';
import type { SecurityAppStore } from '../../common/store/types';
import { KibanaContextProvider } from '../../common/lib/kibana/kibana_react';
import { UpsellingProvider } from '../../common/components/upselling_provider';
import { CaseProvider } from '../../cases/components/provider/provider';
import type { StartServices } from '../../types';
import { APP_NAME } from '../../../common/constants';

export interface SecurityCanvasEmbeddedBundle {
  store: SecurityAppStore;
  kibanaServices: StartServices;
}

export interface SecurityReduxEmbeddedProviderProps {
  /**
   * Resolves the same Redux store and flattened `StartServices` the Security app uses so hooks
   * like `useGlobalTime`, `useKibana().services.data.search`, and `useObservedHost` work in Agent
   * Builder surfaces that sit outside `SecurityApp`'s providers.
   */
  resolveCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
  children: React.ReactNode;
}

/**
 * Agent Builder attachment Canvas renders outside Security's `ReduxStoreProvider` and outside the
 * Security `KibanaContextProvider` shape (flattened `StartServices` including `data`).
 * Also supplies {@link NavigationProvider} so `@kbn/security-solution-navigation` link helpers
 * (`WithLink`, `useGetAppUrl`, …) work the same as inside the Security app shell.
 * {@link ExpandableFlyoutProvider} (without `urlKey`, in-memory mode) is required for components
 * that call `useExpandableFlyoutApi`, e.g. `PreviewLink` in entity flyout panels.
 * {@link CaseProvider} supplies Cases UI context for Lens embeddables and other features that use
 * "add to case" actions (`useCasesContext`).
 * {@link UpsellingProvider} is required for components that call `useUpsellingService` (e.g. graph
 * previews in entity analytics visualizations).
 * {@link CellActionsProvider} is required for Discover-style tables and hover cell actions
 * (`HoverActionsPopover`, entity store table tab), matching `flyoutProviders` in the Security flyout shell.
 */
export const SecurityReduxEmbeddedProvider: React.FC<SecurityReduxEmbeddedProviderProps> = ({
  resolveCanvasContext,
  children,
}) => {
  const [bundle, setBundle] = useState<SecurityCanvasEmbeddedBundle | null>(null);

  useEffect(() => {
    let cancelled = false;
    void resolveCanvasContext().then((next) => {
      if (!cancelled) {
        setBundle(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [resolveCanvasContext]);

  if (bundle == null) {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center" css={{ minHeight: 200 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner
            size="l"
            aria-label={i18n.translate(
              'xpack.securitySolution.agentBuilder.embeddedRedux.loadingAriaLabel',
              { defaultMessage: 'Loading entity overview' }
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <KibanaContextProvider
      services={{
        appName: APP_NAME,
        ...bundle.kibanaServices,
      }}
    >
      <CellActionsProvider
        getTriggerCompatibleActions={bundle.kibanaServices.uiActions.getTriggerCompatibleActions}
      >
        <NavigationProvider core={bundle.kibanaServices}>
          <Provider store={bundle.store}>
            <UpsellingProvider upsellingService={bundle.kibanaServices.upselling}>
              <CaseProvider>
                <ExpandableFlyoutProvider>{children}</ExpandableFlyoutProvider>
              </CaseProvider>
            </UpsellingProvider>
          </Provider>
        </NavigationProvider>
      </CellActionsProvider>
    </KibanaContextProvider>
  );
};
