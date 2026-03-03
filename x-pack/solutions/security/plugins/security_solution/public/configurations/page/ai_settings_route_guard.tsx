/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Redirect } from 'react-router-dom';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { AISettings } from '../tabs/ai_settings';
import { useAgentBuilderAvailability } from '../../agent_builder/hooks/use_agent_builder_availability';
import { useNavigation } from '../../common/lib/kibana';
import { CONFIGURATIONS_PATH } from '../../../common/constants';
import { ConfigurationTabs } from '../constants';

export const AISettingsRouteGuard: React.FC = React.memo(() => {
  const { isAgentChatExperienceEnabled } = useAgentBuilderAvailability();
  const { navigateTo } = useNavigation();

  useEffect(() => {
    if (isAgentChatExperienceEnabled) {
      navigateTo({
        deepLinkId: SecurityPageName.configurationsIntegrations,
      });
    }
  }, [isAgentChatExperienceEnabled, navigateTo]);

  if (isAgentChatExperienceEnabled) {
    return <Redirect to={`${CONFIGURATIONS_PATH}/${ConfigurationTabs.integrations}`} />;
  }

  return <AISettings />;
});

AISettingsRouteGuard.displayName = 'AISettingsRouteGuard';
