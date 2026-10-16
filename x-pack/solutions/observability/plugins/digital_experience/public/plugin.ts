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
  private ux?: DigitalExperienceSetupDeps['ux'];

  public setup(core: CoreSetup, plugins: DigitalExperienceSetupDeps) {
    this.ux = plugins.ux;

    plugins.observabilityShared.navigation.registerSections(
      from(core.getStartServices()).pipe(
        map(([coreStart]) =>
          hasDigitalExperienceAccess(coreStart.application.capabilities)
            ? [
                {
                  label: DIGITAL_EXPERIENCE_LABEL,
                  sortKey: 600,
                  // Prefix match on the app root, so Applications stays selected in the Application view.
                  entries: [
                    { label: APPLICATIONS_LABEL, app: DIGITAL_EXPERIENCE_FEATURE_ID, path: '/' },
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

        return renderApp({
          core: coreStart,
          pluginsStart: pluginsStart as DigitalExperienceStartDeps,
          appMountParameters,
        });
      },
    });
  }

  public start(core: CoreStart) {
    const hasAccess = hasDigitalExperienceAccess(core.application.capabilities);
    this.appUpdater$.next(() => ({
      status: hasAccess ? AppStatus.accessible : AppStatus.inaccessible,
    }));

    // Only users who can see Digital Experience lose the legacy User Experience entry; ux reads
    // this flag once all plugins have started, so calling it here is early enough.
    if (hasAccess) {
      this.ux?.hideLegacyNavigation();
    }
  }

  public stop() {}
}
