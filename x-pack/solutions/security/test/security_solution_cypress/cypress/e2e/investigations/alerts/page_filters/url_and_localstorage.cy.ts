/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import type { FilterControlConfig } from '@kbn/alerts-ui-shared';
import { formatPageFilterSearchParam } from '@kbn/security-solution-plugin/common/utils/format_page_filter_search_param';
import { assertFilterControlsWithFilterObject } from '../../../../tasks/alerts_page_filters';
import { getNewRule } from '../../../../objects/rule';
import {
  FILTER_GROUP_CHANGED_BANNER,
  OPTION_LIST_LABELS,
  OPTION_LIST_VALUES,
} from '../../../../screens/common/filter_group';
import { createRule } from '../../../../tasks/api_calls/rules';
import { login } from '../../../../tasks/login';
import { visitWithTimeRange } from '../../../../tasks/navigation';
import { ALERTS_URL, CASES_URL } from '../../../../urls/navigation';
import { selectPageFilterValue, waitForAlerts, waitForPageFilters } from '../../../../tasks/alerts';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';

const DEFAULT_DETECTION_PAGE_FILTERS: FilterControlConfig[] = [
  {
    title: 'Status',
    field_name: 'kibana.alert.workflow_status',
    selected_options: ['open'],
    persist: true,
    display_settings: {
      hide_action_bar: true,
      hide_exists: true,
    },
  },
  {
    title: 'Severity',
    field_name: 'kibana.alert.severity',
    selected_options: [],
    display_settings: {
      hide_action_bar: true,
      hide_exists: true,
    },
  },
  {
    title: 'User',
    field_name: 'user.name',
  },
  {
    title: 'Host',
    field_name: 'host.name',
  },
];

describe(
  `Alerts page filters - url and localstorage interactions`,
  { tags: ['@ess', '@serverless'] },
  () => {
    beforeEach(() => {
      deleteAlertsAndRules();
      createRule(getNewRule());
      login();
      visitWithTimeRange(ALERTS_URL);
      waitForAlerts();
    });

    it('should populate page filters with default values when nothing is provided in the url', () => {
      assertFilterControlsWithFilterObject();
    });

    it('should load page filters with custom values provided in the url', () => {
      const NEW_FILTERS = DEFAULT_DETECTION_PAGE_FILTERS.filter((item) => item.persist).map(
        (filter) => {
          return {
            ...filter,
            selectedOptions:
              filter.title === 'Status' ? ['open', 'acknowledged'] : filter.selected_options,
          };
        }
      );

      cy.url().then((url) => {
        const currURL = new URL(url);

        currURL.searchParams.set('pageFilters', encode(formatPageFilterSearchParam(NEW_FILTERS)));
        visitWithTimeRange(currURL.toString());
        waitForAlerts();
        assertFilterControlsWithFilterObject(NEW_FILTERS);
      });
    });

    it('should load page filters with custom filters and values', () => {
      const CUSTOM_URL_FILTER = [
        {
          title: 'Process',
          field_name: 'process.name',
          selected_options: ['testing123'],
        },
      ];

      const pageFilterUrlString = formatPageFilterSearchParam(CUSTOM_URL_FILTER);

      cy.url().then((url) => {
        const currURL = new URL(url);

        currURL.searchParams.set('pageFilters', encode(pageFilterUrlString));
        visitWithTimeRange(currURL.toString());

        waitForAlerts();
        cy.get(OPTION_LIST_LABELS).should((sub) => {
          DEFAULT_DETECTION_PAGE_FILTERS.filter((item) => item.persist).forEach((filter, idx) => {
            if (idx === DEFAULT_DETECTION_PAGE_FILTERS.length - 1) {
              expect(sub.eq(idx).text()).eq(CUSTOM_URL_FILTER[0].title);
            } else {
              expect(sub.eq(idx).text()).eq(filter.title);
            }
          });
        });
      });

      cy.get(FILTER_GROUP_CHANGED_BANNER).should('be.visible');
    });

    it(`should update the url when filters are updated`, () => {
      selectPageFilterValue(1, 'high');

      const NEW_FILTERS = DEFAULT_DETECTION_PAGE_FILTERS.map((filter) => {
        return {
          display_settings: {
            hide_action_bar: false,
          },
          ...filter,
          selected_options: filter.title === 'Severity' ? ['high'] : filter.selected_options,
        };
      });
      const expectedVal = encode(formatPageFilterSearchParam(NEW_FILTERS));
      cy.url().should('include', expectedVal);
    });

    it(`should restore filters from localstorage when user navigates back to the page.`, () => {
      selectPageFilterValue(1, 'high');

      // high should be successfully selected.
      cy.get(OPTION_LIST_VALUES(1)).contains('high');
      waitForPageFilters();

      visitWithTimeRange(CASES_URL); // navigate away from alert page
      visitWithTimeRange(ALERTS_URL); // navigate back to alert page

      waitForPageFilters();

      cy.get(OPTION_LIST_VALUES(0)).contains('open'); // status should be Open as previously selected
      cy.get(OPTION_LIST_VALUES(1)).contains('high'); // severity should be low as previously selected
    });
  }
);
