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
import styled from 'styled-components';

/**
 * This module will be loaded asynchronously to reduce the bundle size of your plugin's main bundle.
 */
export function renderApp(
  { element }: AppMountParameters,
  embeddable: Promise<IEmbeddable | undefined>
) {
  // TODO, is this right?
  element.style.display = 'flex';
  element.style.flexGrow = '1';

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

const AppRoot = styled(
  React.memo(
    ({
      embeddable: embeddablePromise,
      className,
    }: {
      embeddable: Promise<IEmbeddable | undefined>;
      className?: string;
    }) => {
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

      return (
        <div
          className={className}
          data-test-subj="resolverEmbeddableContainer"
          ref={setRenderTarget}
        />
      );
    }
  )
)`
  display: flex;
  flex-grow: 1;
`;
