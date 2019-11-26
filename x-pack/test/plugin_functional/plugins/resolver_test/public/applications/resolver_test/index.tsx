/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import ReactDOM from 'react-dom';
import { AppMountContext, AppMountParameters } from 'kibana/public';
import { I18nProvider, FormattedMessage } from '@kbn/i18n/react';
import { IEmbeddable } from 'src/plugins/embeddable/public';

/**
 * This module will be loaded asynchronously to reduce the bundle size of your plugin's main bundle.
 */
export function renderApp(
  ...args: [AppMountContext, AppMountParameters, Promise<IEmbeddable | undefined>]
) {
  const [, { element }, embeddable] = args;

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

const AppRoot: React.FC<{
  embeddable: Promise<IEmbeddable | undefined>;
}> = React.memo(({ embeddable: embeddablePromise }) => {
  const [embeddable, setEmbeddable] = React.useState<IEmbeddable | null | undefined>(null);

  embeddablePromise.then(setEmbeddable);

  return (
    <>
      {embeddable !== null && embeddable !== undefined && (
        <EmbeddableHouse embeddable={embeddable} />
      )}
    </>
  );
});

const EmbeddableHouse: React.FunctionComponent<{ embeddable: IEmbeddable }> = ({ embeddable }) => {
  const embeddableRef = React.createRef<IEmbeddable>();
  if (embeddableRef.current !== embeddable && embeddableRef.current) {
    // Should this component have this concern?
    embeddable.destroy();
  }

  const callbackRef = React.useCallback(
    function(element) {
      embeddable.render(element);
    },
    [embeddable]
  );
  return <div ref={callbackRef} />;
};
