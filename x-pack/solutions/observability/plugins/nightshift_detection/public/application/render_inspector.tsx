/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart } from '@kbn/core/public';
import { InspectorPage } from './inspector_page';

/** Mounts the inspector into the app's element and returns its unmount function. */
export function renderInspector({
  coreStart,
  element,
  isServerless,
}: {
  coreStart: CoreStart;
  element: HTMLElement;
  isServerless: boolean;
}): () => void {
  // The app element clips its content by default, and results pile up past the fold.
  const previousOverflow = element.style.overflow;
  element.style.overflow = 'auto';

  ReactDOM.render(
    coreStart.rendering.addContext(
      <InspectorPage http={coreStart.http} isServerless={isServerless} />
    ),
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
    element.style.overflow = previousOverflow;
  };
}
