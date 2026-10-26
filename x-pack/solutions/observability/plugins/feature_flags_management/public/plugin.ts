/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreSetup, Plugin } from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { APP_ID, APP_ROUTE } from '../common/constants';

export class FeatureFlagsManagementPlugin implements Plugin<void, void> {
  public setup(core: CoreSetup) {
    core.application.register({
      id: APP_ID,
      title: i18n.translate('xpack.featureFlagsManagement.appTitle', {
        defaultMessage: 'Feature flags',
      }),
      category: DEFAULT_APP_CATEGORIES.management,
      appRoute: APP_ROUTE,
      order: 9030,
      euiIconType: 'flag',
      keywords: ['feature flags', 'OFREP', 'OpenFeature', 'rollout'],
      async mount(params: AppMountParameters) {
        const [{ renderApp }, [coreStart]] = await Promise.all([
          import('./application/render_app'),
          core.getStartServices(),
        ]);
        return renderApp(coreStart, params);
      },
    });
  }

  public start() {}

  public stop() {}
}
