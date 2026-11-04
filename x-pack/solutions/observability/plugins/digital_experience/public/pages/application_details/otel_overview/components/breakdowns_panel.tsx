/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import type { Breakdowns } from '../../../../../common/types/usage';
import {
  APPLICATION_OVERVIEW_EBT_ELEMENTS,
  DIGITAL_EXPERIENCE_EBT_ACTIONS,
} from '../../../../ebt_constants';
import type { SessionsListUrlQuery } from '../../../../utils/sessions_list_query';
import type { BarListItem } from '../../../../components/bar_list';
import { BarList } from '../../../../components/bar_list';
import { DataPanel } from '../../../../components/data_panel';
import { BROWSER_LABEL, DEVICE_LABEL, OPERATING_SYSTEM_LABEL } from '../../../../labels';

const TITLE = i18n.translate('xpack.digitalExperience.overview.breakdowns.title', {
  defaultMessage: 'Browsers, operating systems and devices',
});

const SUBTITLE = i18n.translate('xpack.digitalExperience.overview.breakdowns.subtitle', {
  defaultMessage: 'Share of the page loads. Open a browser or system to see its sessions.',
});

const EMPTY_MESSAGE = i18n.translate('xpack.digitalExperience.overview.breakdowns.empty', {
  defaultMessage: 'No page loads with browser details in this time range.',
});

const MOBILE_LABEL = i18n.translate('xpack.digitalExperience.overview.breakdowns.mobile', {
  defaultMessage: 'Mobile',
});

const DESKTOP_LABEL = i18n.translate('xpack.digitalExperience.overview.breakdowns.desktop', {
  defaultMessage: 'Desktop',
});

const sessionsLinkLabel = (name: string) => {
  return i18n.translate('xpack.digitalExperience.overview.breakdowns.sessionsLink', {
    defaultMessage: 'Sessions on {name}',
    values: { name },
  });
};

function Breakdown({
  label,
  items,
  total,
  'data-test-subj': dataTestSubj,
}: {
  label: string;
  items: BarListItem[];
  /** The denominator of each row's share. */
  total: number;
  'data-test-subj': string;
}) {
  return (
    <section data-test-subj={dataTestSubj}>
      <EuiTitle size="xxs">
        <h3>{label}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <BarList items={items} total={total} aria-label={label} />
    </section>
  );
}

/** The page loads by browser, operating system and device type, linked to their sessions. */
export function BreakdownsPanel({
  breakdowns,
  isLoading,
  sessionsHref,
}: {
  breakdowns: Breakdowns;
  isLoading: boolean;
  /** The sessions of the application, narrowed by the given filters. */
  sessionsHref: (query: SessionsListUrlQuery) => string;
}) {
  const { pageLoads: totalPageLoads, browsers, operatingSystems, devices } = breakdowns;

  const toLinkedItems = (
    items: Breakdowns['browsers'],
    filter: 'browser' | 'os',
    element: string
  ): BarListItem[] => {
    return items.map(({ name, pageLoads }) => {
      return {
        key: name,
        value: pageLoads,
        label: (
          <EuiLink
            data-test-subj="digitalExperienceOverviewBreakdownSessionsLink"
            href={sessionsHref({ [filter]: name })}
            aria-label={sessionsLinkLabel(name)}
            {...getEbtProps({ action: DIGITAL_EXPERIENCE_EBT_ACTIONS.VIEW_SESSIONS, element })}
          >
            {name}
          </EuiLink>
        ),
      };
    });
  };

  // Sessions have no device filter, so the devices are not linked.
  const deviceItems = devices.map(({ name, pageLoads }) => {
    return {
      key: name === 'mobile' ? MOBILE_LABEL : DESKTOP_LABEL,
      value: pageLoads,
    };
  });

  return (
    <DataPanel
      title={TITLE}
      subtitle={SUBTITLE}
      isLoading={isLoading}
      isEmpty={browsers.length + operatingSystems.length + devices.length === 0}
      emptyMessage={EMPTY_MESSAGE}
      showInstrumentationDocs
      data-test-subj="digitalExperienceOverviewBreakdowns"
    >
      <Breakdown
        label={BROWSER_LABEL}
        items={toLinkedItems(
          browsers,
          'browser',
          APPLICATION_OVERVIEW_EBT_ELEMENTS.BROWSER_SESSIONS_LINK
        )}
        total={totalPageLoads}
        data-test-subj="digitalExperienceOverviewBrowsers"
      />
      <EuiSpacer size="m" />
      <Breakdown
        label={OPERATING_SYSTEM_LABEL}
        items={toLinkedItems(
          operatingSystems,
          'os',
          APPLICATION_OVERVIEW_EBT_ELEMENTS.OS_SESSIONS_LINK
        )}
        total={totalPageLoads}
        data-test-subj="digitalExperienceOverviewOperatingSystems"
      />
      <EuiSpacer size="m" />
      <Breakdown
        label={DEVICE_LABEL}
        items={deviceItems}
        total={totalPageLoads}
        data-test-subj="digitalExperienceOverviewDevices"
      />
    </DataPanel>
  );
}
