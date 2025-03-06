/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type CoreSetup, AppStatus, DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import type { WorkChatAppPluginStartDependencies } from '../types';
import { WorkChatServices } from '../services';

export const registerApp = ({
  core,
  getServices,
}: {
  core: CoreSetup<WorkChatAppPluginStartDependencies>;
  getServices: () => WorkChatServices;
}) => {
  core.application.register({
    id: 'workchat',
    appRoute: '/app/workchat',
    category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
    euiIconType: 'logoElasticsearch',
    status: AppStatus.accessible,
    title: 'WorkChat',
    updater$: undefined,
    visibleIn: ['sideNav', 'globalSearch'],
    async mount({ element, history }) {
      const [coreStart, startPluginDeps] = await core.getStartServices();
      const services = getServices();
      const { mountApp } = await import('./mount');
      return mountApp({ core: coreStart, services, element, history, plugins: startPluginDeps });
    },
  });
};
