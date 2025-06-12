/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ACCEPTED_A_CONNECTION_VIA } from '../../timeline/body/renderers/system/translations';
import { createSocketRowRenderer } from '../../timeline/body/renderers/system/generic_row_renderer';
import { demoEndgameIpv4ConnectionAcceptEvent } from '../../../../common/demo_data/endgame_ecs/ipv4';
import { ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID } from '../constants';

const SystemSocketExampleComponent: React.FC = () => {
  const systemSocketRowRenderer = createSocketRowRenderer({
    actionName: 'ipv4_connection_accept_event',
    text: ACCEPTED_A_CONNECTION_VIA,
  });
  return (
    <>
      {systemSocketRowRenderer.renderRow({
        data: demoEndgameIpv4ConnectionAcceptEvent,
        scopeId: ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID,
      })}
    </>
  );
};
export const SystemSocketExample = React.memo(SystemSocketExampleComponent);
