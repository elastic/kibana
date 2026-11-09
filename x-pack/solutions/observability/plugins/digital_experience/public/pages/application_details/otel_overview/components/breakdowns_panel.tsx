/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import type { OverviewFilters } from '../../../../../common/overview_filters';
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
import { FILTER_EBT_ELEMENTS } from './overview_filter_labels';

const TITLE = i18n.translate('xpack.digitalExperience.overview.breakdowns.title', {
  defaultMessage: 'Browsers, operating systems and devices',
});

const SUBTITLE = i18n.translate('xpack.digitalExperience.overview.breakdowns.subtitle', {
  defaultMessage:
    'Share of the page loads. Select a row to filter the Overview by it; the arrow of a browser or system opens its sessions.',
});

const EMPTY_MESSAGE = i18n.translate('xpack.digitalExperience.overview.breakdowns.empty', {
  defaultMessage: 'No page loads with browser details in this time range.',
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

const filterLabel = (name: string, isSelected: boolean) => {
  return isSelected
    ? i18n.translate('xpack.digitalExperience.overview.breakdowns.removeFilter', {
        defaultMessage: 'Stop filtering by {name}',
        values: { name },
      })
    : i18n.translate('xpack.digitalExperience.overview.breakdowns.filter', {
        defaultMessage: 'Filter by {name}',
        values: { name },
      });
};

/** The filters the breakdowns can set by a click on a row. */
export type BreakdownFilterName = 'browser' | 'os' | 'device';

/**
 * The page loads by browser, operating system and device. A click on a row filters the Overview by
 * it, or takes the filter off when it is already selected; the arrow of a browser or system opens
 * its sessions.
 */
export function BreakdownsPanel({
  breakdowns,
  isLoading,
  sessionsHref,
  filters,
  onSelectFilter,
}: {
  breakdowns: Breakdowns;
  isLoading: boolean;
  /** The sessions of the application, narrowed by the given filters. */
  sessionsHref: (query: SessionsListUrlQuery) => string;
  /** The Overview's filters, to tell which rows are selected. */
  filters: OverviewFilters;
  /** Includes the value in the filter, or removes it when it is included already. */
  onSelectFilter: (filter: BreakdownFilterName, value: string) => void;
}) {
  const { pageLoads: totalPageLoads, browsers, operatingSystems, devices } = breakdowns;

  const toItems = (
    items: Breakdowns['browsers'],
    filter: BreakdownFilterName,
    sessionsLinkElement?: string
  ): BarListItem[] => {
    return items.map(({ name, pageLoads }) => {
      const isSelected = (filters[filter] ?? []).some(
        ({ value, exclude }) => value === name && !exclude
      );
      return {
        key: name,
        value: pageLoads,
        label: (
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false} className="eui-textTruncate">
              <EuiLink
                color={isSelected ? 'primary' : 'text'}
                css={{ fontWeight: isSelected ? 600 : undefined }}
                aria-pressed={isSelected}
                aria-label={filterLabel(name, isSelected)}
                onClick={() => onSelectFilter(filter, name)}
                data-test-subj={`digitalExperienceOverviewBreakdownFilter-${filter}-${name}`}
                {...getEbtProps({
                  action: DIGITAL_EXPERIENCE_EBT_ACTIONS.SET_FILTER,
                  element: FILTER_EBT_ELEMENTS[filter],
                })}
              >
                {name}
              </EuiLink>
            </EuiFlexItem>
            {/* Sessions have no device filter, so a device has no sessions to open. */}
            {sessionsLinkElement && filter !== 'device' && (
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="chevronSingleRight"
                  size="xs"
                  data-test-subj="digitalExperienceOverviewBreakdownSessionsLink"
                  href={sessionsHref({ [filter]: name })}
                  aria-label={sessionsLinkLabel(name)}
                  {...getEbtProps({
                    action: DIGITAL_EXPERIENCE_EBT_ACTIONS.VIEW_SESSIONS,
                    element: sessionsLinkElement,
                  })}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
      };
    });
  };

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
        items={toItems(
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
        items={toItems(operatingSystems, 'os', APPLICATION_OVERVIEW_EBT_ELEMENTS.OS_SESSIONS_LINK)}
        total={totalPageLoads}
        data-test-subj="digitalExperienceOverviewOperatingSystems"
      />
      <EuiSpacer size="m" />
      <Breakdown
        label={DEVICE_LABEL}
        items={toItems(devices, 'device')}
        total={totalPageLoads}
        data-test-subj="digitalExperienceOverviewDevices"
      />
    </DataPanel>
  );
}
