/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { demoTimelineData } from '../../../../common/demo_data/timeline';
import { zeekRowRenderer } from '../../timeline/body/renderers/zeek/zeek_row_renderer';
import { ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID } from '../constants';

const ZeekExampleComponent: React.FC = () => (
  <>
    {zeekRowRenderer.renderRow({
      data: demoTimelineData[13].ecs,
      scopeId: ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID,
    })}
  </>
);
export const ZeekExample = React.memo(ZeekExampleComponent);
