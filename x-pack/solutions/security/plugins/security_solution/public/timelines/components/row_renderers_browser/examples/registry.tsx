/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { demoEndpointRegistryModificationEvent } from '../../../../common/demo_data/endpoint/registry_modification_event';
import { createEndpointRegistryRowRenderer } from '../../timeline/body/renderers/system/generic_row_renderer';
import { MODIFIED_REGISTRY_KEY } from '../../timeline/body/renderers/system/translations';
import { ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID } from '../constants';

const RegistryExampleComponent: React.FC = () => {
  const registryRowRenderer = createEndpointRegistryRowRenderer({
    actionName: 'modification',
    text: MODIFIED_REGISTRY_KEY,
  });

  return (
    <>
      {registryRowRenderer.renderRow({
        data: demoEndpointRegistryModificationEvent,
        scopeId: ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID,
      })}
    </>
  );
};
export const RegistryExample = React.memo(RegistryExampleComponent);
