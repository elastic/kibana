/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dynamic } from '@kbn/shared-ux-utility';
import React, { useEffect, useState } from 'react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { AIAssistantAppService } from '@kbn/ai-assistant';
import type { AIAssistantPluginStartDependencies } from '@kbn/ai-assistant/src/types';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';

const LazyNavControlWithProvider = dynamic(() =>
  import('.').then((m) => ({ default: m.NavControlWithProvider }))
);

interface NavControlInitiatorProps {
  appService: AIAssistantAppService;
  coreStart: CoreStart;
  pluginsStart: AIAssistantPluginStartDependencies;
}

export const NavControlInitiator = ({ coreStart, pluginsStart }: NavControlInitiatorProps) => {
  const [isClassicExperience, setIsClassicExperience] = useState(true);

  useEffect(() => {
    const sub = coreStart.settings.client
      .get$<AIChatExperience>(AI_CHAT_EXPERIENCE_TYPE)
      .subscribe((chatExperience) => {
        setIsClassicExperience(chatExperience === AIChatExperience.Classic);
      });

    return () => {
      sub.unsubscribe();
    };
  }, [coreStart.settings.client]);

  // Only render nav control for Classic chat experience
  // AI Agents experience uses AgentBuilderNavControl instead
  if (!isClassicExperience) {
    return null;
  }

  return <LazyNavControlWithProvider coreStart={coreStart} pluginsStart={pluginsStart} />;
};
