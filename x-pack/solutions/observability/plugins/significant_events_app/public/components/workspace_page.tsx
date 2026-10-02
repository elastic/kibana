/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import { NIGHTSHIFT_APP_ID, SIGNIFICANT_EVENTS_APP_ID } from '@kbn/deeplinks-observability';
import { EuiCallOut } from '@elastic/eui';
import { useKibana } from '../hooks/use_kibana';
import { useSignificantEventsAvailability } from '../hooks/use_significant_events_availability';
import {
  SignificantEventsAppHeader,
  SignificantEventsAppLoading,
  SignificantEventsAppPageTemplate,
} from './page_template';
import { SignificantEventsNotEnabledPrompt } from './not_enabled_prompt';
import { labels } from '../pages/detection/translations';
import { journey } from '../pages/detection/journey_translations';

export const WorkspacePage = ({
  knowledge = false,
  children,
}: {
  knowledge?: boolean;
  children: React.ReactNode;
}): React.ReactElement => {
  const {
    core: { application, chrome },
  } = useKibana();
  const { availability, isLoading, error } = useSignificantEventsAvailability();
  const capabilities = getNightshiftCapabilities(application.capabilities.nightshift);
  const nightshiftHref = application.getUrlForApp(NIGHTSHIFT_APP_ID);
  useEffect(() => {
    chrome.setBreadcrumbs([
      { text: labels.nightshift, href: nightshiftHref },
      { text: knowledge ? journey.knowledge : labels.title },
    ]);
  }, [chrome, nightshiftHref, knowledge]);

  return (
    <>
      <SignificantEventsAppHeader
        title={knowledge ? journey.knowledge : labels.title}
        back={{ href: nightshiftHref, label: labels.nightshift }}
        menu={{
          items: [
            {
              id: 'detectionKnowledge',
              label: knowledge ? labels.title : journey.knowledge,
              iconType: knowledge ? 'graphApp' : 'documents',
              href: application.getUrlForApp(SIGNIFICANT_EVENTS_APP_ID, {
                path: knowledge ? '/detection' : '/knowledge',
              }),
              overflow: !knowledge,
            },
            {
              id: 'management',
              label: labels.management,
              iconType: 'managementApp',
              href: application.getUrlForApp(SIGNIFICANT_EVENTS_APP_ID, { path: '/streams' }),
            },
            ...(capabilities.canConfigure
              ? [
                  {
                    id: 'settings',
                    label: labels.settings,
                    iconType: 'gear' as const,
                    href: application.getUrlForApp(SIGNIFICANT_EVENTS_APP_ID, {
                      path: '/settings',
                    }),
                    overflow: true,
                  },
                ]
              : []),
          ],
        }}
      />
      {isLoading ? (
        <SignificantEventsAppLoading />
      ) : (
        <SignificantEventsAppPageTemplate.Body grow>
          {error ? (
            <EuiCallOut announceOnMount color="danger" title={labels.loadError}>
              <p>{error instanceof Error ? error.message : labels.loadError}</p>
            </EuiCallOut>
          ) : !availability?.available || !capabilities.canShow ? (
            <SignificantEventsNotEnabledPrompt
              reason={availability && !availability.available ? availability.reason : 'unknown'}
            />
          ) : (
            children
          )}
        </SignificantEventsAppPageTemplate.Body>
      )}
    </>
  );
};
