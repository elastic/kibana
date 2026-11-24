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
}: {
  coreStart: CoreStart;
  element: HTMLElement;
}): () => void {
  ReactDOM.render(coreStart.rendering.addContext(<InspectorPage http={coreStart.http} />), element);

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
}
