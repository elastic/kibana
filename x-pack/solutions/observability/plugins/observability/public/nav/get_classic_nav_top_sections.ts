/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { isAlertingV2Enabled } from '@kbn/alerting-v2-utils';
import type { NavigationEntry, NavigationSection } from '@kbn/observability-shared-plugin/public';
import { getAlertingClassicNavSection } from './get_alerting_classic_nav_section';

const TOP_SECTION_SORT_KEY = 100;
const TOP_TRAILING_SECTION_SORT_KEY = 102;

interface ClassicNavTopEntries {
  overviewLinks: NavigationEntry[];
  alertsLinks: NavigationEntry[];
  trailingLinks: NavigationEntry[];
}

const getTopSection = (entries: NavigationEntry[]): NavigationSection => ({
  label: '',
  sortKey: TOP_SECTION_SORT_KEY,
  entries,
});

/**
 * Unlabeled top sections of the classic Observability in-app sub-nav, split around the labeled
 * Alerting section so it sits directly below Overview while Alerting v2 is on.
 */
export const getClassicNavTopSections = (
  core: CoreStart,
  { overviewLinks, alertsLinks, trailingLinks }: ClassicNavTopEntries
): NavigationSection[] => {
  if (!isAlertingV2Enabled(core)) {
    return [getTopSection([...overviewLinks, ...alertsLinks, ...trailingLinks])];
  }

  const alertingSection = getAlertingClassicNavSection(core);

  if (alertingSection.length === 0) {
    return [getTopSection([...overviewLinks, ...trailingLinks])];
  }

  const sections: NavigationSection[] = [
    getTopSection(overviewLinks),
    ...alertingSection,
    { label: '', sortKey: TOP_TRAILING_SECTION_SORT_KEY, entries: trailingLinks },
  ];

  return sections.filter(({ entries }) => entries.length > 0);
};
