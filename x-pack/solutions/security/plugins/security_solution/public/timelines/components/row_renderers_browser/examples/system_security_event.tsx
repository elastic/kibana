/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createSecurityEventRowRenderer } from '../../timeline/body/renderers/system/generic_row_renderer';
import { demoEndgameUserLogon } from '../../../../common/demo_data/endgame_ecs/user_logon';
import { ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID } from '../constants';

const SystemSecurityEventExampleComponent: React.FC = () => {
  const systemSecurityEventRowRenderer = createSecurityEventRowRenderer({
    actionName: 'user_logon',
  });

  return (
    <>
      {systemSecurityEventRowRenderer.renderRow({
        data: demoEndgameUserLogon,
        scopeId: ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID,
      })}
    </>
  );
};
export const SystemSecurityEventExample = React.memo(SystemSecurityEventExampleComponent);
