/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppStatus,
  DEFAULT_APP_CATEGORIES,
  type AppUpdater,
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import { i18n } from '@kbn/i18n';
import {
  BehaviorSubject,
  Subject,
  combineLatest,
  filter,
  map,
  startWith,
  take,
  type Subscription,
} from 'rxjs';
import { getSpaceIdFromPath } from '@kbn/core-spaces-common';
import {
  ALERTZERO_FEATURE_ID,
  ALERTZERO_APP_ID,
  ALERTZERO_APP_PATH,
  ALERTZERO_ENABLED_SETTING_ID,
} from '@kbn/alertzero-common';
import React from 'react';
import { getSubscriptionAvailability, type SubscriptionAvailability } from '../common/availability';
import { getAlertZeroDeepLinks } from './deep_links';
import { registerAlertZeroAttachmentTypesUI } from './agent_builder/attachment_types';
import type {
  AlertZeroClientConfig,
  AlertZeroPublicSetup,
  AlertZeroPublicStart,
  AlertZeroSetupDependencies,
  AlertZeroStartDependencies,
} from './types';

// Kept as a literal rather than `ALERTZERO_PLUGIN_NAME`: the i18n extractor only reads
// string literals, so a constant reference here would silently drop the message.
const APP_TITLE = i18n.translate('xpack.alertzero.appTitle', {
  defaultMessage: 'AlertZero',
});

export class AlertZeroPublicPlugin
  implements
    Plugin<
      AlertZeroPublicSetup,
      AlertZeroPublicStart,
      AlertZeroSetupDependencies,
      AlertZeroStartDependencies
    >
{
  private readonly config: AlertZeroClientConfig;
  private readonly isServerless: boolean;
  private readonly serverlessTierAvailable$ = new BehaviorSubject(false);
  private readonly availability$ = new BehaviorSubject<SubscriptionAvailability>('loading');
  private availabilitySubscription?: Subscription;
  private attachmentRegistration?: Subscription;
  private readonly startContract: AlertZeroPublicStart = {
    setServerlessTierAvailable: (available) => this.serverlessTierAvailable$.next(available),
  };
  private statusSubscription?: Subscription;
  private readonly logger: Logger;
  /**
   * Allows `start()` to push updated deep links (with capability-resolved visibility)
   * after capabilities become available, without re-registering the application.
   */
  private readonly appUpdater$ = new Subject<AppUpdater>();

  constructor(context: PluginInitializerContext<AlertZeroClientConfig>) {
    this.config = context.config.get();
    this.isServerless = context.env.packageInfo.buildFlavor === 'serverless';
    this.logger = context.logger.get();
  }

  public setup(
    coreSetup: CoreSetup<AlertZeroStartDependencies, AlertZeroPublicStart>,
    _setupDeps: AlertZeroSetupDependencies
  ): AlertZeroPublicSetup {
    if (!this.config.enabled) {
      return { enabled: false };
    }

    coreSetup.application.register({
      id: ALERTZERO_APP_ID,
      title: APP_TITLE,
      appRoute: ALERTZERO_APP_PATH,
      category: DEFAULT_APP_CATEGORIES.security,
      euiIconType: 'securitySignalDetected',
      // Inaccessible until the per-space setting is on. Core then empties `visibleIn` and
      // `deepLinks` for us, which is what removes the AlertZero nodes from the Security
      // navigation tree — those trees hold no check of their own.
      status: AppStatus.inaccessible,
      visibleIn: ['classicSideNav', 'projectSideNav', 'globalSearch'],
      order: 101,
      // Initial deep links without capability filtering — capabilities are not available at
      // setup. `start()` emits an update via appUpdater$ once capabilities are known.
      deepLinks: getAlertZeroDeepLinks(),
      updater$: this.appUpdater$,
      mount: async (params) => {
        const [coreStart, startDeps] = await coreSetup.getStartServices();
        const { renderApp } = await import('./application');
        return renderApp({
          coreStart,
          startDeps,
          params,
          availability$: this.availability$,
          isServerless: this.isServerless,
        });
      },
    });

    return { enabled: true };
  }

  public start(core: CoreStart, startDeps: AlertZeroStartDependencies): AlertZeroPublicStart {
    if (!this.config.enabled) {
      return this.startContract;
    }

    this.availabilitySubscription = combineLatest([
      startDeps.licensing.license$.pipe(startWith(undefined)),
      this.serverlessTierAvailable$,
    ])
      .pipe(
        map(([license, serverlessTierAvailable]) =>
          getSubscriptionAvailability({
            isServerless: this.isServerless,
            serverlessTierAvailable,
            license,
          })
        )
      )
      .subscribe(this.availability$);

    const canRead = core.application.capabilities[ALERTZERO_FEATURE_ID]?.show === true;
    const settingEnabled$ = core.uiSettings.get$<boolean>(ALERTZERO_ENABLED_SETTING_ID, false);
    this.statusSubscription = combineLatest([settingEnabled$, this.availability$]).subscribe(
      ([settingEnabled, availability]) => {
        const showNavigation = settingEnabled && canRead && availability === 'available';
        this.appUpdater$.next(() => ({
          status: settingEnabled ? AppStatus.accessible : AppStatus.inaccessible,
          visibleIn: showNavigation ? ['classicSideNav', 'projectSideNav', 'globalSearch'] : [],
          deepLinks: showNavigation ? getAlertZeroDeepLinks(core.application.capabilities) : [],
        }));
      }
    );

    const { agentBuilder } = startDeps;
    if (!agentBuilder || !startDeps.agenticInvestigations || !startDeps.proposals) {
      return this.startContract;
    }
    const canAccess$ = combineLatest([settingEnabled$, this.availability$]).pipe(
      map(([enabled, availability]) => enabled && canRead && availability === 'available')
    );

    // Space id comes from the base path so registration starts synchronously.
    const { spaceId } = getSpaceIdFromPath(
      core.http.basePath.get(),
      core.http.basePath.serverBasePath
    );

    const AttachmentAccessBoundary = React.lazy(async () => {
      const [{ KibanaContextProvider }, { AccessBoundary }] = await Promise.all([
        import('@kbn/kibana-react-plugin/public'),
        import('./components/access_boundary'),
      ]);
      const services = { ...core, ...startDeps };
      const Boundary: React.FC<React.PropsWithChildren> = ({ children }) =>
        React.createElement(
          KibanaContextProvider,
          { services },
          React.createElement(
            AccessBoundary,
            {
              availability$: this.availability$,
              serviceAccountsEnabled: core.security.serviceAccounts.isEnabled(),
            },
            children
          )
        );
      return { default: Boundary };
    });

    this.attachmentRegistration = canAccess$.pipe(filter(Boolean), take(1)).subscribe(() => {
      registerAlertZeroAttachmentTypesUI(agentBuilder.attachments, {
        AccessBoundary: AttachmentAccessBoundary,
        http: core.http,
        navigation: {
          share: startDeps.share,
          spaceId,
          prependPath: (path) => core.http.basePath.prepend(path),
          getUrlForApp: core.application.getUrlForApp,
        },
      }).catch((error) => {
        this.logger.error('Failed to register AlertZero attachment UI definitions', error);
      });
    });

    return this.startContract;
  }

  public stop() {
    this.availabilitySubscription?.unsubscribe();
    this.attachmentRegistration?.unsubscribe();
    this.statusSubscription?.unsubscribe();
  }
}
