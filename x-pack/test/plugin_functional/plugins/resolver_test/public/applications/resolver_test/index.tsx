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
 * Render the Resolver Test app. Returns a cleanup function.
 */
export function renderApp(
  { element }: AppMountParameters,
  embeddable: Promise<IEmbeddable | undefined>
) {
  /**
   * The application DOM node should take all available space.
   */
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
      /**
       * A promise which resolves to the Resolver embeddable.
       */
      embeddable: Promise<IEmbeddable | undefined>;
      /**
       * A `className` string provided by `styled`
       */
      className?: string;
    }) => {
      /**
       * This state holds the reference to the embeddable, once resolved.
       */
      const [embeddable, setEmbeddable] = React.useState<IEmbeddable | undefined>(undefined);
      /**
       * This state holds the reference to the DOM node that will contain the embeddable.
       */
      const [renderTarget, setRenderTarget] = React.useState<HTMLDivElement | null>(null);

      /**
       * Keep component state with the Resolver embeddable.
       *
       * If the reference to the embeddablePromise changes, we ignore the stale promise.
       */
      useEffect(() => {
        /**
         * A promise rejection function that will prevent a stale embeddable promise from being resolved
         * as the current eembeddable.
         *
         * If the embeddablePromise itself changes before the old one is resolved, we cancel and restart this effect.
         */
        let cleanUp;

        const cleanupPromise = new Promise<never>((_resolve, reject) => {
          cleanUp = reject;
        });

        /**
         * Either set the embeddable in state, or cancel and restart this process.
         */
        Promise.race([cleanupPromise, embeddablePromise]).then((value) => {
          setEmbeddable(value);
        });

        /**
         * If `embeddablePromise` is changed, the cleanup function is run.
         */
        return cleanUp;
      }, [embeddablePromise]);

      /**
       * Render the eembeddable into the DOM node.
       */
      useEffect(() => {
        if (embeddable && renderTarget) {
          embeddable.render(renderTarget);
          /**
           * If the embeddable or DOM node changes then destroy the old embeddable.
           */
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
  /**
   * Take all available space.
   */
  display: flex;
  flex-grow: 1;
`;
