/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { encode } from '@kbn/rison';
import { DEFAULT_DETECTION_PAGE_FILTERS } from '@kbn/security-solution-plugin/common/constants';
import { formatPageFilterSearchParam } from '@kbn/security-solution-plugin/common/utils/format_page_filter_search_param';

import { FilterControlConfig } from '@kbn/alerts-ui-shared';
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
  FILTER_GROUP_CONTROL_ACTION_EDIT,
  FILTER_GROUP_EDIT_CONTROL_PANEL_ITEMS,
} from '../../../screens/common/filter_group';
import { createRule } from '../../../tasks/api_calls/rules';
import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';
import { ALERTS_URL, CASES_URL } from '../../../urls/navigation';
import {
  closePageFilterPopover,
  markAcknowledgedFirstAlert,
  openPageFilterPopover,
  resetFilters,
  selectCountTable,
  togglePageFilterPopover,
  visitAlertsPageWithCustomFilters,
  waitForAlerts,
  waitForPageFilters,
} from '../../../tasks/alerts';
import { ALERTS_COUNT, ALERTS_REFRESH_BTN, EMPTY_ALERT_TABLE } from '../../../screens/alerts';
import { kqlSearch } from '../../../tasks/security_header';
import {
  addNewFilterGroupControlValues,
  cancelFieldEditing,
  deleteFilterGroupControl,
  discardFilterGroupControls,
  editFilterGroupControl,
  editFilterGroupControls,
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
      const selectedOptionsText =
        filter.selectedOptions && filter.selectedOptions.length > 0
          ? filter.selectedOptions.join('')
          : '';
      expect(sub.text().replace(',', '').replace(' ', '')).to.have.string(selectedOptionsText);
    });
  });
};

// FLAKY: https://github.com/elastic/kibana/issues/171890
describe.skip(`Detections : Page Filters`, { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteAlertsAndRules();
    createRule(getNewRule({ rule_id: 'custom_rule_filters' }));
    login();
    visitWithTimeRange(ALERTS_URL);
    waitForAlerts();
  });

  it('Default page filters are populated when nothing is provided in the URL', () => {
    assertFilterControlsWithFilterObject();
  });

  context('Alert Page Filters Customization ', () => {
    it('should be able to delete Controls', () => {
      waitForPageFilters();
      editFilterGroupControls();
      deleteFilterGroupControl(3);
      cy.get(CONTROL_FRAMES).should((sub) => {
        expect(sub.length).lt(4);
      });
      discardFilterGroupControls();
    });

    it('should be able to add new Controls', () => {
      const fieldName = 'event.module';
      const label = 'EventModule';
      editFilterGroupControls();
      deleteFilterGroupControl(3);
      addNewFilterGroupControlValues({
        fieldName,
        label,
      });
      cy.get(CONTROL_FRAME_TITLE).should('contain.text', label);
      discardFilterGroupControls();
      cy.get(CONTROL_FRAME_TITLE).should('not.contain.text', label);
    });

    it('should be able to edit Controls', () => {
      const fieldName = 'event.module';
      const label = 'EventModule';
      editFilterGroupControls();
      editFilterGroupControl({ idx: 3, fieldName, label });
      cy.get(CONTROL_FRAME_TITLE).should('contain.text', label);
      discardFilterGroupControls();
      cy.get(CONTROL_FRAME_TITLE).should('not.contain.text', label);
    });

    it('should not sync to the URL in edit mode but only in view mode', () => {
      cy.url().then((urlString) => {
        editFilterGroupControls();
        deleteFilterGroupControl(3);
        addNewFilterGroupControlValues({ fieldName: 'event.module', label: 'Event Module' });
        cy.url().should('eq', urlString);
        saveFilterGroupControls();
        cy.url().should('not.eq', urlString);
      });
    });
  });

  it('Page filters are loaded with custom values provided in the URL', () => {
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

  it('Page filters are loaded with custom filters and values', () => {
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

  context('with data modificiation', () => {
    it(`Alert list is updated when the alerts are updated`, () => {
      // mark status of one alert to be acknowledged
      selectCountTable();
      cy.get(ALERTS_COUNT)
        .invoke('text')
        .then((noOfAlerts) => {
          const originalAlertCount = noOfAlerts.split(' ')[0];
          markAcknowledgedFirstAlert();
          waitForAlerts();
          cy.get(OPTION_LIST_VALUES(0)).click();
          cy.get(OPTION_SELECTABLE(0, 'acknowledged')).should('be.visible').trigger('click');
          cy.get(ALERTS_COUNT)
            .invoke('text')
            .should((newAlertCount) => {
              expect(newAlertCount.split(' ')[0]).eq(String(parseInt(originalAlertCount, 10)));
            });
        });
    });
  });

  it(`URL is updated when filters are updated`, () => {
    openPageFilterPopover(1);
    cy.get(OPTION_SELECTABLE(1, 'high')).should('be.visible');
    cy.get(OPTION_SELECTABLE(1, 'high')).click();
    closePageFilterPopover(1);

    const NEW_FILTERS = DEFAULT_DETECTION_PAGE_FILTERS.map((filter) => {
      return {
        ...filter,
        selectedOptions: filter.title === 'Severity' ? ['high'] : filter.selectedOptions,
      };
    });
    const expectedVal = encode(formatPageFilterSearchParam(NEW_FILTERS));
    cy.url().should('include', expectedVal);
  });

  it(`Filters are restored from localstorage when user navigates back to the page.`, () => {
    cy.get(OPTION_LIST_VALUES(1)).click();
    cy.get(OPTION_SELECTABLE(1, 'high')).should('be.visible');
    cy.get(OPTION_SELECTABLE(1, 'high')).click({});

    // high should be scuccessfully selected.
    cy.get(OPTION_LIST_VALUES(1)).contains('high');
    waitForPageFilters();

    visitWithTimeRange(CASES_URL); // navigate away from alert page
    visitWithTimeRange(ALERTS_URL); // navigate back to alert page

    waitForPageFilters();

    cy.get(OPTION_LIST_VALUES(0)).contains('open'); // status should be Open as previously selected
    cy.get(OPTION_LIST_VALUES(1)).contains('high'); // severity should be low as previously selected
  });

  it('Custom filters from URLS are populated & changed banner is displayed', () => {
    visitAlertsPageWithCustomFilters(customFilters);
    waitForPageFilters();

    assertFilterControlsWithFilterObject(customFilters);

    cy.get(FILTER_GROUP_CHANGED_BANNER).should('be.visible');
  });

  it('Changed banner should hide on saving changes', () => {
    visitAlertsPageWithCustomFilters(customFilters);
    waitForPageFilters();
    cy.get(FILTER_GROUP_CHANGED_BANNER).should('be.visible');
    saveFilterGroupControls();
    cy.get(FILTER_GROUP_CHANGED_BANNER).should('not.exist');
  });

  it('Changed banner should hide on discarding changes', () => {
    visitAlertsPageWithCustomFilters(customFilters);
    waitForPageFilters();
    cy.get(FILTER_GROUP_CHANGED_BANNER).should('be.visible');
    discardFilterGroupControls();
    cy.get(FILTER_GROUP_CHANGED_BANNER).should('not.exist');
  });

  it('Changed banner should hide on Reset', () => {
    visitAlertsPageWithCustomFilters(customFilters);
    waitForPageFilters();
    resetFilters();
    cy.get(FILTER_GROUP_CHANGED_BANNER).should('not.exist');
  });

  context('Impact of inputs', () => {
    it('should recover from invalid kql Query result', () => {
      // do an invalid search
      //
      kqlSearch('\\');
      cy.get(ALERTS_REFRESH_BTN).click();
      waitForPageFilters();
      cy.get(TOASTER).should('contain.text', 'KQLSyntaxError');
      togglePageFilterPopover(0);
      cy.get(OPTION_SELECTABLE(0, 'open')).should('be.visible');
      cy.get(OPTION_SELECTABLE(0, 'open')).should('contain.text', 'open');
      cy.get(OPTION_SELECTABLE(0, 'open')).get(OPTION_SELECTABLE_COUNT).should('have.text', 1);
    });

    it('should take kqlQuery into account', () => {
      kqlSearch('kibana.alert.workflow_status: "nothing"');
      cy.get(ALERTS_REFRESH_BTN).trigger('click');
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
      const startDateWithZeroAlerts = 'Jan 1, 2002 @ 00:00:00.000';
      const endDateWithZeroAlerts = 'Jan 1, 2010 @ 00:00:00.000';
      setStartDate(startDateWithZeroAlerts);
      setEndDate(endDateWithZeroAlerts);

      cy.get(ALERTS_REFRESH_BTN).trigger('click');
      waitForPageFilters();
      togglePageFilterPopover(0);
      cy.get(CONTROL_POPOVER(0)).should('contain.text', 'No options found');
      cy.get(EMPTY_ALERT_TABLE).should('be.visible');
    });
  });
  it('Number fields are not visible in field edit panel', () => {
    const idx = 3;
    const { FILTER_FIELD_TYPE, FIELD_TYPES } = FILTER_GROUP_EDIT_CONTROL_PANEL_ITEMS;
    editFilterGroupControls();
    cy.get(CONTROL_FRAME_TITLE).eq(idx).realHover();
    cy.get(FILTER_GROUP_CONTROL_ACTION_EDIT(idx)).click();
    cy.get(FILTER_FIELD_TYPE).click();
    cy.get(FIELD_TYPES.STRING).should('be.visible');
    cy.get(FIELD_TYPES.BOOLEAN).should('be.visible');
    cy.get(FIELD_TYPES.IP).should('be.visible');
    cy.get(FIELD_TYPES.NUMBER).should('not.exist');
    cancelFieldEditing();
    discardFilterGroupControls();
  });
});
