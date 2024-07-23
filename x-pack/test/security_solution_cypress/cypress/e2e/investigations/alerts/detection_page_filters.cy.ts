/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { encode } from '@kbn/rison';
import { DEFAULT_DETECTION_PAGE_FILTERS } from '@kbn/security-solution-plugin/common/constants';
import { formatPageFilterSearchParam } from '@kbn/security-solution-plugin/common/utils/format_page_filter_search_param';

import type { FilterControlConfig } from '@kbn/alerts-ui-shared';
import { getNewRule } from '../../../objects/rule';
import {
  CONTROL_FRAMES,
  CONTROL_FRAME_TITLE,
  CONTROL_POPOVER,
  FILTER_GROUP_CHANGED_BANNER,
  OPTION_LIST_LABELS,
  OPTION_LIST_VALUES,
  OPTION_SELECTABLE,
  OPTION_SELECTABLE_COUNT,
  FILTER_GROUP_EDIT_CONTROL_PANEL_ITEMS,
} from '../../../screens/common/filter_group';
import { createRule } from '../../../tasks/api_calls/rules';
import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';
import { ALERTS_URL, CASES_URL } from '../../../urls/navigation';
import {
  markAcknowledgedFirstAlert,
  openPageFilterPopover,
  resetFilters,
  selectCountTable,
  selectPageFilterValue,
  togglePageFilterPopover,
  visitAlertsPageWithCustomFilters,
  waitForAlerts,
  waitForPageFilters,
} from '../../../tasks/alerts';
import { ALERTS_COUNT, EMPTY_ALERT_TABLE } from '../../../screens/alerts';
import { kqlSearch, refreshPage } from '../../../tasks/security_header';
import {
  addNewFilterGroupControlValues,
  deleteFilterGroupControl,
  discardFilterGroupControls,
  editFilterGroupControl,
  switchFilterGroupControlsToEditMode,
  editSingleFilterControl,
  saveFilterGroupControls,
} from '../../../tasks/common/filter_group';
import { TOASTER } from '../../../screens/alerts_detection_rules';
import { setEndDate, setStartDate } from '../../../tasks/date_picker';
import { fillAddFilterForm, openAddFilterPopover } from '../../../tasks/search_bar';
import { deleteAlertsAndRules } from '../../../tasks/api_calls/common';

const customFilters = [
  {
    fieldName: 'kibana.alert.workflow_status',
    title: 'Workflow Status',
  },
  {
    fieldName: 'kibana.alert.severity',
    title: 'Severity',
  },
  {
    fieldName: 'user.name',
    title: 'User Name',
  },
  {
    fieldName: 'process.name',
    title: 'ProcessName',
  },
  {
    fieldName: 'event.module',
    title: 'EventModule',
  },
  {
    fieldName: 'agent.type',
    title: 'AgentType',
  },
  {
    fieldName: 'kibana.alert.rule.name',
    title: 'Rule Name',
  },
];
const assertFilterControlsWithFilterObject = (
  filterObject: FilterControlConfig[] = DEFAULT_DETECTION_PAGE_FILTERS
) => {
  cy.get(CONTROL_FRAMES).should((sub) => {
    expect(sub.length).eq(filterObject.length);
  });

  cy.get(OPTION_LIST_LABELS).should((sub) => {
    filterObject.forEach((filter, idx) => {
      expect(sub.eq(idx).text()).eq(filter.title);
    });
  });

  filterObject.forEach((filter, idx) => {
    cy.get(OPTION_LIST_VALUES(idx)).should((sub) => {
      const controlText = sub.text();
      filter.selectedOptions?.forEach((option) => {
        expect(controlText).to.have.string(option);
      });
    });
  });
};

// FLAKY: https://github.com/elastic/kibana/issues/167914
describe.skip(`Detections : Page Filters`, { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteAlertsAndRules();
    createRule(getNewRule());
    login();
    visitWithTimeRange(ALERTS_URL);
    waitForAlerts();
  });

  it('should populate page filters with default values when nothing is provided in the URL', () => {
    assertFilterControlsWithFilterObject();
  });

  context('Alert Page Filters Customization ', () => {
    it('should be able to customize Controls', () => {
      const fieldName = 'event.module';
      const label = 'EventModule';
      switchFilterGroupControlsToEditMode();
      cy.log('should be able delete an existing control');
      deleteFilterGroupControl(3);
      cy.get(CONTROL_FRAMES).should((sub) => {
        expect(sub.length).lt(4);
      });

      // ================================================
      cy.log('should be able to add a new control');
      // ================================================

      addNewFilterGroupControlValues({
        fieldName,
        label,
      });
      cy.get(CONTROL_FRAME_TITLE).should('contain.text', label);
      discardFilterGroupControls();
      cy.get(CONTROL_FRAME_TITLE).should('not.contain.text', label);

      // ================================================
      cy.log('should be able to edit an existing control');
      // ================================================

      switchFilterGroupControlsToEditMode();
      editFilterGroupControl({ idx: 3, fieldName, label });
      cy.get(CONTROL_FRAME_TITLE).should('contain.text', label);
      discardFilterGroupControls();
      cy.get(CONTROL_FRAME_TITLE).should('not.contain.text', label);
    });

    it('should not sync to the URL in edit mode but only in view mode', () => {
      cy.url().then((urlString) => {
        switchFilterGroupControlsToEditMode();
        deleteFilterGroupControl(3);
        addNewFilterGroupControlValues({ fieldName: 'event.module', label: 'Event Module' });
        cy.url().should('eq', urlString);
        saveFilterGroupControls();
        cy.url().should('not.eq', urlString);
      });
    });
  });

  it('should load page filters with custom values provided in the URL', () => {
    const NEW_FILTERS = DEFAULT_DETECTION_PAGE_FILTERS.filter((item) => item.persist).map(
      (filter) => {
        return {
          ...filter,
          selectedOptions:
            filter.title === 'Status' ? ['open', 'acknowledged'] : filter.selectedOptions,
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
        fieldName: 'process.name',
        selectedOptions: ['testing123'],
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

  // Flaky: https://github.com/elastic/kibana/issues/181977
  context.skip('with data modification', () => {
    /*
     *
     * default scrollBehavior is true, which scrolls the element into view automatically without any scroll Margin
     * if an element has some hover actions above the element, they get hidden on top of the window.
     * So, we need to set scrollBehavior to false to avoid scrolling the element into view and we can scroll ourselves
     * when needed.
     *
     * Ref : https://docs.cypress.io/guides/core-concepts/interacting-with-elements#Scrolling
     */
    it(
      `should update alert status list when the alerts are updated`,
      {
        scrollBehavior: false,
      },
      () => {
        // mark status of one alert to be acknowledged
        selectCountTable();
        cy.get(ALERTS_COUNT)
          .invoke('text')
          .then((noOfAlerts) => {
            const originalAlertCount = noOfAlerts.split(' ')[0];
            markAcknowledgedFirstAlert();
            waitForAlerts();
            selectPageFilterValue(0, 'acknowledged');
            cy.get(ALERTS_COUNT)
              .invoke('text')
              .should((newAlertCount) => {
                expect(newAlertCount.split(' ')[0]).eq(String(parseInt(originalAlertCount, 10)));
              });
          });
      }
    );
  });

  it(`should update URL when filters are updated`, () => {
    selectPageFilterValue(1, 'high');

    const NEW_FILTERS = DEFAULT_DETECTION_PAGE_FILTERS.map((filter) => {
      return {
        hideActionBar: false,
        ...filter,
        selectedOptions: filter.title === 'Severity' ? ['high'] : filter.selectedOptions,
      };
    });
    const expectedVal = encode(formatPageFilterSearchParam(NEW_FILTERS));
    cy.url().should('include', expectedVal);
  });

  it(`should restore Filters from localstorage when user navigates back to the page.`, () => {
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

  it('should populate Custom filters & display the changed banner', () => {
    visitAlertsPageWithCustomFilters(customFilters);
    waitForPageFilters();

    assertFilterControlsWithFilterObject(customFilters);

    cy.get(FILTER_GROUP_CHANGED_BANNER).should('be.visible');
  });

  it('should hide Changed banner on saving changes', () => {
    visitAlertsPageWithCustomFilters(customFilters);
    waitForPageFilters();
    cy.get(FILTER_GROUP_CHANGED_BANNER).should('be.visible');
    saveFilterGroupControls();
    cy.get(FILTER_GROUP_CHANGED_BANNER).should('not.exist');
  });

  it('should hide Changed banner on discarding changes', () => {
    visitAlertsPageWithCustomFilters(customFilters);
    waitForPageFilters();
    cy.get(FILTER_GROUP_CHANGED_BANNER).should('be.visible');
    discardFilterGroupControls();
    cy.get(FILTER_GROUP_CHANGED_BANNER).should('not.exist');
  });

  it('should hide Changed banner on Reset', () => {
    visitAlertsPageWithCustomFilters(customFilters);
    waitForPageFilters();
    resetFilters();
    cy.get(FILTER_GROUP_CHANGED_BANNER).should('not.exist');
  });

  context('Impact of inputs', () => {
    it('should recover from invalid kql Query result', () => {
      // do an invalid search
      kqlSearch('\\');
      refreshPage();
      waitForPageFilters();
      cy.get(TOASTER).should('contain.text', 'KQLSyntaxError');
      togglePageFilterPopover(0);
      cy.get(OPTION_SELECTABLE(0, 'open')).should('be.visible');
      cy.get(OPTION_SELECTABLE(0, 'open')).should('contain.text', 'open');
      cy.get(OPTION_SELECTABLE(0, 'open')).get(OPTION_SELECTABLE_COUNT).should('have.text', 1);
    });

    it('should take kqlQuery into account', () => {
      kqlSearch('kibana.alert.workflow_status: "nothing"');
      refreshPage();
      waitForPageFilters();
      togglePageFilterPopover(0);
      cy.get(CONTROL_POPOVER(0)).should('contain.text', 'No options found');
      cy.get(EMPTY_ALERT_TABLE).should('be.visible');
    });

    it('should take filters into account', () => {
      openAddFilterPopover();
      fillAddFilterForm({
        key: 'kibana.alert.workflow_status',
        operator: 'is',
        value: 'invalid',
      });
      waitForPageFilters();
      openPageFilterPopover(0);
      cy.get(CONTROL_POPOVER(0)).should('contain.text', 'No options found');
      cy.get(EMPTY_ALERT_TABLE).should('be.visible');
    });

    it('should take timeRange into account', () => {
      const dateRangeWithZeroAlerts = ['Jan 1, 2002 @ 00:00:00.000', 'Jan 1, 2002 @ 00:00:00.000'];
      setStartDate(dateRangeWithZeroAlerts[0]);
      setEndDate(dateRangeWithZeroAlerts[1]);

      refreshPage();
      waitForPageFilters();
      togglePageFilterPopover(0);
      cy.get(CONTROL_POPOVER(0)).should('contain.text', 'No options found');
      cy.get(EMPTY_ALERT_TABLE).should('be.visible');
    });
  });
  it('should not show number fields are not visible in field edit panel', () => {
    const idx = 3;
    const { FILTER_FIELD_TYPE, FIELD_TYPES } = FILTER_GROUP_EDIT_CONTROL_PANEL_ITEMS;
    switchFilterGroupControlsToEditMode();
    editSingleFilterControl(idx);
    cy.get(FILTER_FIELD_TYPE).click();
    cy.get(FIELD_TYPES.STRING).should('be.visible');
    cy.get(FIELD_TYPES.BOOLEAN).should('be.visible');
    cy.get(FIELD_TYPES.IP).should('be.visible');
    cy.get(FIELD_TYPES.NUMBER).should('not.exist');
  });
});
