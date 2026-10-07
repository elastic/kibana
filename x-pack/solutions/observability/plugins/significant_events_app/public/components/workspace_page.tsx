/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import { NIGHTSHIFT_APP_ID, SIGNIFICANT_EVENTS_APP_ID } from '@kbn/deeplinks-observability';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
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
import { evidenceSearch } from './evidence_chain/evidence_context';
import { sourcesPageLabels } from '../pages/detection/sources_translations';

export const WorkspacePage = ({
  knowledge = false,
  sources = false,
  children,
  nextSteps,
}: {
  knowledge?: boolean;
  sources?: boolean;
  children: React.ReactNode;
  nextSteps?: { enabled: boolean; onChange: (enabled: boolean) => void };
}): React.ReactElement => {
  const {
    core: { application, chrome },
  } = useKibana();
  const location = useLocation();
  const detectionSearch = new URLSearchParams(location.search);
  for (const key of ['stream', 'drawer', 'engine']) detectionSearch.delete(key);
  const detectionHref = application.getUrlForApp(SIGNIFICANT_EVENTS_APP_ID, {
    path: `/detection?${detectionSearch}`,
  });
  const sourcesHref = application.getUrlForApp(SIGNIFICANT_EVENTS_APP_ID, {
    path: `/detection/sources?${evidenceSearch(location.search, { kind: 'source', id: '' })}`,
  });
  const { availability, isLoading, error } = useSignificantEventsAvailability();
  const capabilities = getNightshiftCapabilities(application.capabilities.nightshift);
  const nightshiftHref = application.getUrlForApp(NIGHTSHIFT_APP_ID);
  useEffect(() => {
    chrome.setBreadcrumbs([
      { text: labels.nightshift, href: nightshiftHref },
      {
        text: knowledge ? journey.knowledge : labels.title,
        ...(sources ? { href: detectionHref } : {}),
      },
      ...(sources ? [{ text: sourcesPageLabels.title }] : []),
    ]);
  }, [chrome, nightshiftHref, knowledge, sources, detectionHref]);

  return (
    <>
      <SignificantEventsAppHeader
        title={sources ? sourcesPageLabels.title : knowledge ? journey.knowledge : labels.title}
        back={
          sources
            ? { href: detectionHref, label: labels.title }
            : { href: nightshiftHref, label: labels.nightshift }
        }
        menu={{
          switch: nextSteps
            ? {
                id: 'detectionNextSteps',
                label: i18n.translate('xpack.significantEventsApp.nextSteps.label', {
                  defaultMessage: 'Next steps',
                }),
                checked: nextSteps.enabled,
                onChange: nextSteps.onChange,
                tooltipContent: i18n.translate('xpack.significantEventsApp.nextSteps.hint', {
                  defaultMessage:
                    'Show the next implementation priorities. Turn off to explore the full demo.',
                }),
                'data-test-subj': 'detectionNextStepsToggle',
              }
            : undefined,
          items: [
            ...(!knowledge && !sources
              ? [
                  {
                    id: 'detectionSources',
                    label: sourcesPageLabels.title,
                    iconType: 'database' as const,
                    href: sourcesHref,
                  },
                ]
              : []),
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
