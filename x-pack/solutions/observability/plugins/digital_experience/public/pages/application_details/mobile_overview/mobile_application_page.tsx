/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { EuiPageSection } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderBadge } from '@kbn/app-header';
import { APPLICATION_SOURCE } from '../../../../common/application_source';
import {
  MOBILE_APPLICATION_TAB_IDS,
  type ApplicationTabId,
  type MobileApplicationTabId,
  type MobilePlatform,
} from '../../../../common/types/applications';
import { useRouteBreadcrumb } from '../../../breadcrumbs/use_route_breadcrumb';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS } from '../../../ebt_constants';
import { useApplicationLinks } from '../../../hooks/use_application_links';
import { useApplicationsHref } from '../../../hooks/use_applications_href';
import { useShareAction } from '../../../hooks/use_share_action';
import {
  APPLICATIONS_LABEL,
  APPLICATION_TAB_LABELS,
  OPEN_IN_DISCOVER_LABEL,
  PLATFORM_LABELS,
} from '../../../labels';
import { MobileCrashesTab } from '../mobile_crashes/mobile_crashes_tab';
import { MobileOverview } from './mobile_overview';
import { useMobileDiscoverHref } from './use_mobile_discover_href';
import { useMobileKpis } from './use_mobile_kpis';

/** Mobile applications are EDOT data. */
const SOURCE = APPLICATION_SOURCE.otel;

/** The platforms the application reported on, as the header's badges. */
const platformBadges = (platforms: MobilePlatform[]): AppHeaderBadge[] =>
  platforms.map((platform) => ({
    label: PLATFORM_LABELS[platform],
    color: 'hollow',
    'data-test-subj': `digitalExperienceMobilePlatformBadge-${platform}`,
  }));

const isMobileTab = (tab: ApplicationTabId): tab is MobileApplicationTabId =>
  MOBILE_APPLICATION_TAB_IDS.some((id) => id === tab);

/**
 * A mobile application's page, all its platforms: its header, with its platforms as badges and
 * Open in Discover as an action, as the Session page has it, and its Overview and Crashes tabs.
 * The page fetches the KPIs, whose filter options both tabs use.
 */
export function MobileApplicationPage({
  serviceName,
  selectedTab,
}: {
  serviceName: string;
  selectedTab: ApplicationTabId;
}) {
  const history = useHistory();
  const applicationsHref = useApplicationsHref();
  const { overviewHref, overviewPath, crashesHref } = useApplicationLinks(serviceName, SOURCE);
  const tabHrefs: Record<MobileApplicationTabId, string> = {
    overview: overviewHref,
    crashes: crashesHref,
  };
  // A web application's tab isn't one of this page's: its URL is replaced by the Overview's.
  const tab: MobileApplicationTabId = isMobileTab(selectedTab) ? selectedTab : 'overview';
  const shareAction = useShareAction({ serviceName, source: SOURCE, tab });
  const discoverHref = useMobileDiscoverHref(serviceName, tab);
  const kpisState = useMobileKpis(serviceName);

  const isUnsupportedTab = !isMobileTab(selectedTab);
  useEffect(() => {
    if (isUnsupportedTab) {
      history.replace(overviewPath);
    }
  }, [history, isUnsupportedTab, overviewPath]);

  useRouteBreadcrumb([
    { text: serviceName, href: overviewHref },
    { text: APPLICATION_TAB_LABELS[tab] },
  ]);

  return (
    <>
      <AppHeader
        title={serviceName}
        back={{ href: applicationsHref, label: APPLICATIONS_LABEL }}
        share={shareAction}
        badges={platformBadges(kpisState.kpis?.platforms ?? [])}
        menu={{
          items: [
            ...(discoverHref
              ? [
                  {
                    id: 'openInDiscover',
                    order: 1,
                    label: OPEN_IN_DISCOVER_LABEL,
                    iconType: 'discoverApp',
                    href: discoverHref,
                    testId: 'digitalExperienceMobileOpenInDiscover',
                    ebt: { action: DIGITAL_EXPERIENCE_EBT_ACTIONS.OPEN_IN_DISCOVER },
                  },
                ]
              : []),
          ],
        }}
        tabs={MOBILE_APPLICATION_TAB_IDS.map((id) => ({
          id,
          label: APPLICATION_TAB_LABELS[id],
          isSelected: id === tab,
          href: tabHrefs[id],
          'data-test-subj': `digitalExperienceTab-${id}`,
        }))}
      />
      {!isUnsupportedTab && (
        <EuiPageSection paddingSize="m" restrictWidth={false}>
          {tab === 'crashes' ? (
            <MobileCrashesTab serviceName={serviceName} kpisState={kpisState} />
          ) : (
            <MobileOverview serviceName={serviceName} kpisState={kpisState} />
          )}
        </EuiPageSection>
      )}
    </>
  );
}
