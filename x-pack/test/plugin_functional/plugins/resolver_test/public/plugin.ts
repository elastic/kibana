/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { FlattenedPromise, flattenedPromise } from '../common/flattened_promise';
import {
  Start as EmbeddablePluginStart,
  IEmbeddable,
} from '../../../../../../src/plugins/embeddable/public';

export class ResolverTestPlugin implements Plugin {
  private embeddable: FlattenedPromise<IEmbeddable | undefined> = flattenedPromise();
  public setup(core: CoreSetup) {
    core.application.register({
      id: 'resolver_test',
      title: i18n.translate('xpack.resolver_test.pluginTitle', {
        defaultMessage: 'Resolver Test',
      }),
      mount: async (context, params) => {
        const { renderApp } = await import('./applications/resolver_test');
        return renderApp(context, params, this.embeddable.promise);
      },
    });
  }

  public start(...args: [unknown, { embeddable: EmbeddablePluginStart }]) {
    const [, plugins] = args;
    const factory = plugins.embeddable.getEmbeddableFactory('resolver');
    this.embeddable.resolve(factory.create({ id: 'what is id for?' }));
  }
  public stop() {}
}
