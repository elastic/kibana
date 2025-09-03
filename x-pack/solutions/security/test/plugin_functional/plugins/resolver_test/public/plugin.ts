/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, AppMountParameters } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { PluginSetup as SecuritySolutionPluginSetup } from '@kbn/security-solution-plugin/public';

export type ResolverTestPluginSetup = void;
export type ResolverTestPluginStart = void;
export interface ResolverTestPluginSetupDependencies {
  securitySolution: SecuritySolutionPluginSetup;
}
export interface ResolverTestPluginStartDependencies {} // eslint-disable-line @typescript-eslint/no-empty-interface

export class ResolverTestPlugin
  implements
    Plugin<
      ResolverTestPluginSetup,
      ResolverTestPluginStart,
      ResolverTestPluginSetupDependencies,
      ResolverTestPluginStartDependencies
    >
{
  public setup(
    core: CoreSetup<ResolverTestPluginStartDependencies, ResolverTestPluginStart>,
    setupDependencies: ResolverTestPluginSetupDependencies
  ) {
    core.application.register({
      id: 'resolverTest',
      title: i18n.translate('xpack.resolverTest.pluginTitle', {
        defaultMessage: 'Resolver Test',
      }),
      mount: async (params: AppMountParameters<unknown>) => {
        const startServices = await core.getStartServices();
        const [coreStart] = startServices;

        const [{ renderApp }, resolverPluginSetup] = await Promise.all([
          import('./applications/resolver_test'),
          setupDependencies.securitySolution.resolver(),
        ]);
        return renderApp(coreStart, params, resolverPluginSetup);
      },
    });
  }

  public start() {}
}
