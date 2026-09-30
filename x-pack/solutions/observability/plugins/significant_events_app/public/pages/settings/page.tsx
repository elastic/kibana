/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import React, { useEffect } from 'react';
import {
  SignificantEventsAppHeader,
  SignificantEventsAppLoading,
  SignificantEventsAppPageTemplate,
} from '../../components/page_template';
import { SignificantEventsNotEnabledPrompt } from '../../components/not_enabled_prompt';
import { useKibana } from '../../hooks/use_kibana';
import { useSignificantEventsAppParams } from '../../hooks/use_significant_events_app_params';
import { useSignificantEventsAppRouter } from '../../hooks/use_significant_events_app_router';
import { useSignificantEventsAvailability } from '../../hooks/use_significant_events_availability';
import { SettingsTab } from '../significant_events/components/settings/tab';

const settingsTitle = i18n.translate('xpack.significantEventsApp.settingsPage.title', {
  defaultMessage: 'Settings',
});

const nightshiftLabel = i18n.translate(
  'xpack.significantEventsApp.settingsPage.backToNightshiftLabel',
  {
    defaultMessage: 'Nightshift',
  }
);

const managementLabel = i18n.translate(
  'xpack.significantEventsApp.settingsPage.backToManagementLabel',
  {
    defaultMessage: 'Nightshift Management',
  }
);

export function SettingsPage() {
  const {
    core: {
      application: {
        capabilities: { nightshift },
        getUrlForApp,
        navigateToApp,
      },
      chrome,
    },
  } = useKibana();
  const { query } = useSignificantEventsAppParams('/settings');
  const router = useSignificantEventsAppRouter();
  const { canConfigure } = getNightshiftCapabilities(nightshift);
  const { availability, isLoading: isAvailabilityLoading } = useSignificantEventsAvailability();
  // Settings opens from both Nightshift and the Management page; Back returns to the one it
  // came from.
  const fromTab = query?.fromTab;
  const backHref = fromTab
    ? router.link('/{tab}', { path: { tab: fromTab } })
    : getUrlForApp(NIGHTSHIFT_APP_ID);
  const backLabel = fromTab ? managementLabel : nightshiftLabel;

  useEffect(() => {
    if (!canConfigure) {
      void navigateToApp(NIGHTSHIFT_APP_ID);
    }
  }, [canConfigure, navigateToApp]);

  useEffect(() => {
    if (canConfigure) {
      chrome.setBreadcrumbs([{ text: backLabel, href: backHref }, { text: settingsTitle }]);
    }
  }, [canConfigure, chrome, backHref, backLabel]);

  if (!canConfigure) {
    return null;
  }

  if (isAvailabilityLoading) {
    return <SignificantEventsAppLoading />;
  }

  if (!availability || !availability.available) {
    const reason = availability?.reason ?? 'unknown';
    return (
      <SignificantEventsAppPageTemplate.Body grow>
        <SignificantEventsNotEnabledPrompt reason={reason} />
      </SignificantEventsAppPageTemplate.Body>
    );
  }

  return (
    <>
      <SignificantEventsAppHeader
        title={settingsTitle}
        back={{ href: backHref, label: backLabel }}
      />
      <SignificantEventsAppPageTemplate.Body grow>
        <SettingsTab />
      </SignificantEventsAppPageTemplate.Body>
    </>
  );
}
