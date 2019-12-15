/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { IEmbeddable, IEmbeddableStart } from '../../../../../../src/plugins/embeddable/public';

export type ResolverTestPluginSetup = void;
export type ResolverTestPluginStart = void;
export interface ResolverTestPluginSetupDependencies {} // eslint-disable-line @typescript-eslint/no-empty-interface
export interface ResolverTestPluginStartDependencies {
  embeddable: IEmbeddableStart;
}

export class ResolverTestPlugin
  implements
    Plugin<
      ResolverTestPluginSetup,
      ResolverTestPluginStart,
      ResolverTestPluginSetupDependencies,
      ResolverTestPluginStartDependencies
    > {
  private resolveEmbeddable!: (
    value: IEmbeddable | undefined | PromiseLike<IEmbeddable | undefined> | undefined
  ) => void;
  private embeddablePromise: Promise<IEmbeddable | undefined> = new Promise<
    IEmbeddable | undefined
  >(resolve => {
    this.resolveEmbeddable = resolve;
  });
  public setup(core: CoreSetup) {
    core.application.register({
      id: 'resolver_test',
      title: i18n.translate('xpack.resolver_test.pluginTitle', {
        defaultMessage: 'Resolver Test',
      }),
      mount: async (_context, params) => {
        const { renderApp } = await import('./applications/resolver_test');
        return renderApp(params, this.embeddablePromise);
      },
    });
  }

  public start(...args: [unknown, { embeddable: IEmbeddableStart }]) {
    const [, plugins] = args;
    const factory = plugins.embeddable.getEmbeddableFactory('resolver');
    this.resolveEmbeddable(factory.create({ id: 'test basic render' }));
  }
  public stop() {}
}
