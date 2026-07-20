/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiLoadingSpinner, EuiPanel } from '@elastic/eui';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { useDarkMode } from '@kbn/kibana-react-plugin/public';
import { useSelector } from 'react-redux-v7';
import type { SecurityAppStore, State } from '../../../common/store/types';
import type { StartServices } from '../../../types';
import { useInitDataViewManager } from '../../../data_view_manager/hooks/use_init_data_view_manager';
import { flyoutProviders } from '../../../flyout_v2/shared/components/flyout_provider';
import { SecuritySolutionFlyout } from '../../../flyout';
import { RulePreviewAttachmentErrorCallout } from './error_callout';
import type { RulePreviewAttachmentServices } from './types';

export const RulePreviewAttachmentDataViewBootstrap = () => {
  const initDataViewManager = useInitDataViewManager();
  const sharedStatus = useSelector((state: State) => state.dataViewManager.shared.status);

  useEffect(() => {
    if (sharedStatus === 'pristine' || sharedStatus === 'error') {
      initDataViewManager([]);
    }
  }, [initDataViewManager, sharedStatus]);

  return null;
};

const RulePreviewAttachmentThemeProvider: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => {
  const darkMode = useDarkMode();

  return <EuiThemeProvider darkMode={darkMode}>{children}</EuiThemeProvider>;
};

export const RulePreviewAttachmentSecurityProviders: React.FC<
  React.PropsWithChildren<Pick<RulePreviewAttachmentServices, 'getServices' | 'getStore'>>
> = ({ children, getServices, getStore }) => {
  const [securityContext, setSecurityContext] = useState<{
    services: StartServices;
    store: SecurityAppStore;
  }>();
  const [error, setError] = useState<Error>();

  useEffect(() => {
    let isMounted = true;

    Promise.all([getServices(), getStore()])
      .then(([services, store]) => {
        if (isMounted) {
          setSecurityContext({ services, store });
        }
      })
      .catch((contextError) => {
        if (isMounted) {
          setError(contextError instanceof Error ? contextError : new Error(String(contextError)));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [getServices, getStore]);

  if (error) {
    return <RulePreviewAttachmentErrorCallout />;
  }

  if (!securityContext) {
    return (
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m">
        <EuiLoadingSpinner />
      </EuiPanel>
    );
  }

  return flyoutProviders({
    services: securityContext.services,
    store: securityContext.store,
    children: (
      <RulePreviewAttachmentThemeProvider>
        {children}
        <SecuritySolutionFlyout />
      </RulePreviewAttachmentThemeProvider>
    ),
  });
};
