/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { demoTimelineData } from '../../../../common/demo_data/timeline';
import { suricataRowRenderer } from '../../timeline/body/renderers/suricata/suricata_row_renderer';
import { ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID } from '../constants';

const SuricataExampleComponent: React.FC = () => (
  <>
    {suricataRowRenderer.renderRow({
      data: demoTimelineData[2].ecs,
      scopeId: ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID,
    })}
  </>
);
export const SuricataExample = React.memo(SuricataExampleComponent);
