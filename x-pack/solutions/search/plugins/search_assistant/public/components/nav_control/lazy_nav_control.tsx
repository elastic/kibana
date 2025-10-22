/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dynamic } from '@kbn/shared-ux-utility';
import React from 'react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { AIAssistantAppService } from '@kbn/ai-assistant';
import type { AIAssistantPluginStartDependencies } from '@kbn/ai-assistant/src/types';

const LazyNavControlWithProvider = dynamic(() =>
  import('.').then((m) => ({ default: m.NavControlWithProvider }))
);

interface NavControlInitiatorProps {
  appService: AIAssistantAppService;
  coreStart: CoreStart;
  pluginsStart: AIAssistantPluginStartDependencies;
}

export const NavControlInitiator = ({ coreStart, pluginsStart }: NavControlInitiatorProps) => {
  return <LazyNavControlWithProvider coreStart={coreStart} pluginsStart={pluginsStart} />;
};
