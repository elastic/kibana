/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, from, map } from 'rxjs';
import type {
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  CoreStart,
  Plugin,
} from '@kbn/core/public';
import { AppStatus, DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { DIGITAL_EXPERIENCE_FEATURE_ID } from '../common/feature';
import { hasDigitalExperienceAccess } from './capabilities';
import { APPLICATIONS_LABEL, DIGITAL_EXPERIENCE_LABEL } from './labels';
import type { DigitalExperienceSetupDeps, DigitalExperienceStartDeps } from './types';

export class DigitalExperiencePlugin
  implements Plugin<void, void, DigitalExperienceSetupDeps, DigitalExperienceStartDeps>
{
  private readonly appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));

  public setup(core: CoreSetup<DigitalExperienceStartDeps>, plugins: DigitalExperienceSetupDeps) {
    plugins.observabilityShared.navigation.registerSections(
      from(core.getStartServices()).pipe(
        map(([coreStart]) =>
          hasDigitalExperienceAccess(coreStart.application.capabilities)
            ? [
                {
                  label: DIGITAL_EXPERIENCE_LABEL,
                  sortKey: 600,
                  entries: [
                    {
                      label: APPLICATIONS_LABEL,
                      app: DIGITAL_EXPERIENCE_FEATURE_ID,
                      path: '/',
                      // Every page belongs to Applications; `path: '/'` alone misses the app root,
                      // whose router path is '' when the URL has no trailing slash.
                      matchPath: () => true,
                    },
                  ],
                },
              ]
            : []
        )
      )
    );

    core.application.register({
      id: DIGITAL_EXPERIENCE_FEATURE_ID,
      title: DIGITAL_EXPERIENCE_LABEL,
      order: 8500,
      euiIconType: 'logoObservability',
      category: DEFAULT_APP_CATEGORIES.observability,
      updater$: this.appUpdater$,
      keywords: ['RUM', 'Real User Monitoring', 'digital experience', 'web performance'],
      async mount(appMountParameters: AppMountParameters) {
        const [{ renderApp }, [coreStart, pluginsStart]] = await Promise.all([
          import('./application/render_app'),
          core.getStartServices(),
        ]);

        return renderApp({ core: coreStart, pluginsStart, appMountParameters });
      },
    });
  }

  public start(core: CoreStart, { ux }: DigitalExperienceStartDeps) {
    if (!hasDigitalExperienceAccess(core.application.capabilities)) {
      this.appUpdater$.next(() => ({ status: AppStatus.inaccessible }));
      return;
    }

    this.appUpdater$.next(() => ({ status: AppStatus.accessible }));
    // Only users who can use Digital Experience lose the legacy User Experience entry.
    ux?.hideLegacyNavigation();
  }

  public stop() {}
}
