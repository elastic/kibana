/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { KubernetesContainer } from './pages';
import { useIsExperimentalFeatureEnabled } from '../common/hooks/use_experimental_features';
import type { SecuritySubPluginRoutes } from '../app/types';
import { SecurityPageName } from '../app/types';
import { KUBERNETES_PATH, APP_PATH } from '../../common/constants';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';

const KubernetesRoutesGuard = () => {
  const isKubernetesEnabled = useIsExperimentalFeatureEnabled('kubernetesEnabled');

  if (!isKubernetesEnabled) {
    return <Redirect to={APP_PATH} />;
  }

  return (
    <PluginTemplateWrapper>
      <TrackApplicationView viewId={SecurityPageName.kubernetes}>
        <KubernetesContainer />
      </TrackApplicationView>
    </PluginTemplateWrapper>
  );
};

export const routes: SecuritySubPluginRoutes = [
  {
    path: KUBERNETES_PATH,
    component: KubernetesRoutesGuard,
  },
];
