/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { demoEndpointLibraryLoadEvent } from '../../../../common/demo_data/endpoint/library_load_event';
import { createEndpointLibraryRowRenderer } from '../../timeline/body/renderers/system/generic_row_renderer';
import { LOADED_LIBRARY } from '../../timeline/body/renderers/system/translations';
import { ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID } from '../constants';

const LibraryExampleComponent: React.FC = () => {
  const libraryRowRenderer = createEndpointLibraryRowRenderer({
    actionName: 'load',
    text: LOADED_LIBRARY,
  });

  return (
    <>
      {libraryRowRenderer.renderRow({
        data: demoEndpointLibraryLoadEvent,
        scopeId: ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID,
      })}
    </>
  );
};
export const LibraryExample = React.memo(LibraryExampleComponent);
