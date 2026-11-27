/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { InspectorPage } from './inspector_page';
import { createDiscoverLinks } from './signals_in_discover';

/** Mounts the inspector into the app's element and returns its unmount function. */
export function renderInspector({
  coreStart,
  element,
  isServerless,
  data,
  share,
  spaceId,
}: {
  coreStart: CoreStart;
  element: HTMLElement;
  isServerless: boolean;
  data: DataPublicPluginStart;
  share?: SharePluginStart;
  /** The active space, whose signals the page shows. */
  spaceId: string;
}): () => void {
  // The app element clips its content by default, and results pile up past the fold.
  const previousOverflow = element.style.overflow;
  element.style.overflow = 'auto';

  ReactDOM.render(
    coreStart.rendering.addContext(
      <InspectorPage
        http={coreStart.http}
        isServerless={isServerless}
        data={data}
        spaceId={spaceId}
        discoverLinks={createDiscoverLinks({ share, spaceId })}
      />
    ),
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
    element.style.overflow = previousOverflow;
  };
}
