/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { IEmbeddable, EmbeddableStart } from '../../../../../../src/plugins/embeddable/public';

export type ResolverTestPluginSetup = void;
export type ResolverTestPluginStart = void;
export interface ResolverTestPluginSetupDependencies {} // eslint-disable-line @typescript-eslint/no-empty-interface
export interface ResolverTestPluginStartDependencies {
  embeddable: EmbeddableStart;
}

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
      id: 'resolver_test',
      title: i18n.translate('xpack.resolver_test.pluginTitle', {
        defaultMessage: 'Resolver Test',
      }),
      mount: async (_context, params) => {
        let resolveEmbeddable: (
          value: IEmbeddable | undefined | PromiseLike<IEmbeddable | undefined> | undefined
        ) => void;

        const promise = new Promise<IEmbeddable | undefined>((resolve) => {
          resolveEmbeddable = resolve;
        });

        (async () => {
          const [, { embeddable }] = await core.getStartServices();
          const factory = embeddable.getEmbeddableFactory('resolver');
          if (factory) {
            resolveEmbeddable!(factory.create({ id: 'test basic render' }));
          }
        })();

        const { renderApp } = await import('./applications/resolver_test');
        /**
         * Pass a promise which resolves to the Resolver embeddable.
         */
        return renderApp(params, promise);
      },
    });
  }

  public start() {}
}
