/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { CoreStart } from '@kbn/core/public';
import { QueryClientProvider } from '@kbn/react-query';
import { STREAMS_SIGNIFICANT_EVENTS_APPS_ENABLED_FLAG } from '@kbn/significant-events-plugin/common';
import { SignificantEventsAppContextProvider } from '../../app_root/app_context_provider';
import type { SignificantEventsAppKibanaContext } from '../../hooks/use_kibana';
import { SlackAppCard } from '../../pages/significant_events/components/settings/apps_section';
import { significantEventsQueryClient } from '../../query_client';
import type { SignificantEventsAppServices } from '../../services/types';
import type { SignificantEventsAppStartDependencies } from '../../types';

/** Props of the Elastic Slack App card other plugins embed. */
export interface EmbeddableSlackAppCardProps {
  /** Replaces the Significant Events description. */
  description?: string;
}

/**
 * Builds the Elastic Slack App card for other plugins, wired to this plugin's services. Editing
 * follows the Streams manage privilege, like the Significant Events settings.
 */
export const createEmbeddableSlackAppCard = ({
  coreStart,
  pluginsStart,
  services,
}: {
  coreStart: CoreStart;
  pluginsStart: SignificantEventsAppStartDependencies;
  services: SignificantEventsAppServices;
}): React.FC<EmbeddableSlackAppCardProps> => {
  const context: SignificantEventsAppKibanaContext = {
    core: coreStart,
    dependencies: { start: pluginsStart },
    services,
  };
  const isAppsEnabled$ = coreStart.featureFlags.getBooleanValue$(
    STREAMS_SIGNIFICANT_EVENTS_APPS_ENABLED_FLAG,
    false
  );
  const canEdit = coreStart.application.capabilities.streams?.manage === true;

  const EmbeddableSlackAppCard: React.FC<EmbeddableSlackAppCardProps> = ({ description }) => {
    const isAppsEnabled = useObservable(isAppsEnabled$, false);
    return (
      <SignificantEventsAppContextProvider context={context}>
        <QueryClientProvider client={significantEventsQueryClient}>
          <SlackAppCard
            canEdit={canEdit}
            description={description}
            isEnabled={isAppsEnabled}
            showWhenUnavailable
          />
        </QueryClientProvider>
      </SignificantEventsAppContextProvider>
    );
  };
  return EmbeddableSlackAppCard;
};
