/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'kibana/public';
import { i18n } from '@kbn/i18n';

export type ResolverTestPluginSetup = void;
export type ResolverTestPluginStart = void;
export interface ResolverTestPluginSetupDependencies {} // eslint-disable-line @typescript-eslint/no-empty-interface
export interface ResolverTestPluginStartDependencies {} // eslint-disable-line @typescript-eslint/no-empty-interface

export class ResolverTestPlugin
  implements
    Plugin<
      ResolverTestPluginSetup,
      ResolverTestPluginStart,
      ResolverTestPluginSetupDependencies,
      ResolverTestPluginStartDependencies
    > {
  public setup(core: CoreSetup<ResolverTestPluginStartDependencies>) {
    core.application.register({
      id: 'resolverTest',
      title: i18n.translate('xpack.resolverTest.pluginTitle', {
        defaultMessage: 'Resolver Test',
      }),
      mount: async (context, params) => {
        const { renderApp } = await import('./applications/resolver_test');
        return renderApp(context, params);
      },
    });
  }

  public start() {}
}
