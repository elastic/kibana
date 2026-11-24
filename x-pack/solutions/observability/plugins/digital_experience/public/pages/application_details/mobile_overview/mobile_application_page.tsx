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
import { i18n } from '@kbn/i18n';
import { APPLICATION_SOURCE } from '../../../../common/application_source';
import type { ApplicationTabId, MobilePlatform } from '../../../../common/types/applications';
import { useRouteBreadcrumb } from '../../../breadcrumbs/use_route_breadcrumb';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS } from '../../../ebt_constants';
import { useApplicationLinks } from '../../../hooks/use_application_links';
import { useApplicationsHref } from '../../../hooks/use_applications_href';
import { useQueryParam } from '../../../hooks/use_query_param';
import { useShareAction } from '../../../hooks/use_share_action';
import {
  APPLICATIONS_LABEL,
  APPLICATION_TAB_LABELS,
  OPEN_IN_DISCOVER_LABEL,
  PLATFORM_LABELS,
} from '../../../labels';
import { MobileOverview } from './mobile_overview';
import { useMobileDiscoverHref } from './use_mobile_discover_href';
import { useMobileKpis } from './use_mobile_kpis';

/** Mobile applications are EDOT data. */
const SOURCE = APPLICATION_SOURCE.otel;

const COMPARE_LABEL = i18n.translate('xpack.digitalExperience.mobile.compare', {
  defaultMessage: 'Compare to the previous period',
});

/** The platforms the application reported on, as the header's badges. */
const platformBadges = (platforms: MobilePlatform[]): AppHeaderBadge[] =>
  platforms.map((platform) => ({
    label: PLATFORM_LABELS[platform],
    color: 'hollow',
    'data-test-subj': `digitalExperienceMobilePlatformBadge-${platform}`,
  }));

/**
 * A mobile application's page, all its platforms: its header, with its platforms as badges and
 * Compare and Open in Discover as actions, as the Session page has them, and its Overview, its only
 * tab, which shows the KPIs the page fetches.
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
  const { overviewHref, overviewPath } = useApplicationLinks(serviceName, SOURCE);
  const shareAction = useShareAction({ serviceName, source: SOURCE, tab: 'overview' });
  const discoverHref = useMobileDiscoverHref(serviceName);
  const kpisState = useMobileKpis(serviceName);
  // In the URL, so a reload or Share keeps it.
  const { value: compare, setValue: setCompare } = useQueryParam('compare');
  const isComparing = compare === 'true';

  // Any other tab's URL is replaced by the Overview's.
  const isOverview = selectedTab === 'overview';
  useEffect(() => {
    if (!isOverview) {
      history.replace(overviewPath);
    }
  }, [history, isOverview, overviewPath]);

  useRouteBreadcrumb([
    { text: serviceName, href: overviewHref },
    { text: APPLICATION_TAB_LABELS.overview },
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
            {
              id: 'compare',
              order: 1,
              label: COMPARE_LABEL,
              iconType: 'compare',
              isSelected: isComparing,
              run: () => setCompare(isComparing ? undefined : 'true'),
              testId: 'digitalExperienceMobileCompareToggle',
              ebt: { action: DIGITAL_EXPERIENCE_EBT_ACTIONS.TOGGLE_COMPARE },
            },
            ...(discoverHref
              ? [
                  {
                    id: 'openInDiscover',
                    order: 2,
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
        tabs={[
          {
            id: 'overview',
            label: APPLICATION_TAB_LABELS.overview,
            isSelected: true,
            href: overviewHref,
            'data-test-subj': 'digitalExperienceTab-overview',
          },
        ]}
      />
      {isOverview && (
        <EuiPageSection paddingSize="m" restrictWidth={false}>
          <MobileOverview kpisState={kpisState} />
        </EuiPageSection>
      )}
    </>
  );
}
