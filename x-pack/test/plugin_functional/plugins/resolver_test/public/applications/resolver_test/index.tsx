/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters } from 'kibana/public';
import { I18nProvider } from '@kbn/i18n/react';
import { IEmbeddable } from 'src/plugins/embeddable/public';
import { useEffect } from 'react';

/**
 * This module will be loaded asynchronously to reduce the bundle size of your plugin's main bundle.
 */
export function renderApp(
  { element }: AppMountParameters,
  embeddable: Promise<IEmbeddable | undefined>
) {
  ReactDOM.render(
    <I18nProvider>
      <AppRoot embeddable={embeddable} />
    </I18nProvider>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
}

const AppRoot = React.memo(
  ({ embeddable: embeddablePromise }: { embeddable: Promise<IEmbeddable | undefined> }) => {
    const [embeddable, setEmbeddable] = React.useState<IEmbeddable | undefined>(undefined);
    const [renderTarget, setRenderTarget] = React.useState<HTMLDivElement | null>(null);

    useEffect(() => {
      let cleanUp;
      Promise.race([
        new Promise<never>((_resolve, reject) => {
          cleanUp = reject;
        }),
        embeddablePromise,
      ]).then(value => {
        setEmbeddable(value);
      });

      return cleanUp;
    }, [embeddablePromise]);

    useEffect(() => {
      if (embeddable && renderTarget) {
        embeddable.render(renderTarget);
        return () => {
          embeddable.destroy();
        };
      }
    }, [embeddable, renderTarget]);

    return <div data-test-subj="resolverEmbeddableContainer" ref={setRenderTarget} />;
  }
);
