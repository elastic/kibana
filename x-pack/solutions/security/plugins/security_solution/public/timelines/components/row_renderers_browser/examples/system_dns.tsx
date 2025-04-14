/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createDnsRowRenderer } from '../../timeline/body/renderers/system/generic_row_renderer';
import { demoEndgameDnsRequest } from '../../../../common/demo_data/endgame_ecs/dns';
import { ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID } from '../constants';

const SystemDnsExampleComponent: React.FC = () => {
  const systemDnsRowRenderer = createDnsRowRenderer();

  return (
    <>
      {systemDnsRowRenderer.renderRow({
        data: demoEndgameDnsRequest,
        scopeId: ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID,
      })}
    </>
  );
};
export const SystemDnsExample = React.memo(SystemDnsExampleComponent);
