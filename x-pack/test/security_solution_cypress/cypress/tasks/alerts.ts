/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import { recurse } from 'cypress-recurse';
import { formatPageFilterSearchParam } from '@kbn/security-solution-plugin/common/utils/format_page_filter_search_param';
import type { FilterItemObj } from '@kbn/security-solution-plugin/public/common/components/filter_group/types';
import {
  ADD_EXCEPTION_BTN,
  ALERT_CHECKBOX,
  CLOSE_ALERT_BTN,
  CLOSE_SELECTED_ALERTS_BTN,
  EXPAND_ALERT_BTN,
  MARK_ALERT_ACKNOWLEDGED_BTN,
  OPEN_ALERT_BTN,
  SEND_ALERT_TO_TIMELINE_BTN,
  SELECT_AGGREGATION_CHART,
  TAKE_ACTION_POPOVER_BTN,
  TIMELINE_CONTEXT_MENU_BTN,
  CLOSE_FLYOUT,
  OPEN_ANALYZER_BTN,
  TAKE_ACTION_BTN,
  TAKE_ACTION_MENU,
  ADD_ENDPOINT_EXCEPTION_BTN,
  DATAGRID_CHANGES_IN_PROGRESS,
  CLOSED_ALERTS_FILTER_BTN,
  OPENED_ALERTS_FILTER_BTN,
  EVENT_CONTAINER_TABLE_LOADING,
  SELECT_ALL_ALERTS,
  SELECT_ALL_VISIBLE_ALERTS,
  CELL_ADD_TO_TIMELINE_BUTTON,
  CELL_FILTER_IN_BUTTON,
  CELL_SHOW_TOP_FIELD_BUTTON,
  ACTIONS_EXPAND_BUTTON,
  ALERT_EMBEDDABLE_PROGRESS_BAR,
  ALERT_COUNT_TABLE_COLUMN,
  SELECT_HISTOGRAM,
  CELL_FILTER_OUT_BUTTON,
  ALERTS_HISTOGRAM_LEGEND,
  LEGEND_ACTIONS,
  SESSION_VIEWER_BUTTON,
  ALERT_TAGGING_CONTEXT_MENU_ITEM,
  ALERT_TAGGING_CONTEXT_MENU,
  ALERT_TAGGING_UPDATE_BUTTON,
  ALERTS_HISTOGRAM_PANEL_LOADER,
  ALERT_TABLE_SUMMARY_VIEW_SELECTABLE,
  ALERT_TABLE_EVENT_RENDERED_VIEW_OPTION,
  HOVER_ACTIONS_CONTAINER,
  ALERT_TABLE_GRID_VIEW_OPTION,
  TOOLTIP,
} from '../screens/alerts';
import { LOADING_INDICATOR, REFRESH_BUTTON } from '../screens/security_header';
import { TIMELINE_COLUMN_SPINNER } from '../screens/timeline';
import {
  UPDATE_ENRICHMENT_RANGE_BUTTON,
  ENRICHMENT_QUERY_END_INPUT,
  ENRICHMENT_QUERY_RANGE_PICKER,
  ENRICHMENT_QUERY_START_INPUT,
  THREAT_INTEL_TAB,
  CELL_EXPAND_VALUE,
} from '../screens/alerts_details';
import { FIELD_INPUT } from '../screens/exceptions';
import {
  CONTROL_FRAME_TITLE,
  DETECTION_PAGE_FILTERS_LOADING,
  DETECTION_PAGE_FILTER_GROUP_LOADING,
  DETECTION_PAGE_FILTER_GROUP_RESET_BUTTON,
  DETECTION_PAGE_FILTER_GROUP_WRAPPER,
  OPTION_LISTS_LOADING,
  OPTION_LIST_VALUES,
  OPTION_LIST_CLEAR_BTN,
  OPTION_SELECTABLE,
  CONTROL_GROUP,
} from '../screens/common/filter_group';
import { LOADING_SPINNER } from '../screens/common/page';
import { ALERTS_URL } from '../urls/navigation';
import { FIELDS_BROWSER_BTN } from '../screens/rule_details';
import { openFilterGroupContextMenu } from './common/filter_group';
import { visitWithTimeRange } from './navigation';

export const addExceptionFromFirstAlert = () => {
  expandFirstAlertActions();
  cy.get(ADD_EXCEPTION_BTN, { timeout: 10000 }).first().click();
  cy.get(LOADING_SPINNER).should('exist');
  cy.get(LOADING_SPINNER).should('not.exist');
};

export const openAddEndpointExceptionFromFirstAlert = () => {
  expandFirstAlertActions();
  cy.get(ADD_ENDPOINT_EXCEPTION_BTN).click();
  cy.get(FIELD_INPUT).should('be.visible');
};

export const openAddRuleExceptionFromAlertActionButton = () => {
  cy.get(TAKE_ACTION_BTN).click();
  cy.get(TAKE_ACTION_MENU).should('be.visible');

  cy.get(ADD_EXCEPTION_BTN, { timeout: 10000 }).first().click();
};

export const openAddEndpointExceptionFromAlertActionButton = () => {
  cy.get(TAKE_ACTION_BTN).click();
  cy.get(TAKE_ACTION_MENU).should('be.visible');
  cy.get(ADD_ENDPOINT_EXCEPTION_BTN, { timeout: 10000 }).first().click();
};
export const closeFirstAlert = () => {
  expandFirstAlertActions();
  cy.get(CLOSE_ALERT_BTN).should('be.visible');
  cy.get(CLOSE_ALERT_BTN).click();
  cy.get(CLOSE_ALERT_BTN).should('not.exist');
};

export const closeAlerts = () => {
  cy.get(TAKE_ACTION_POPOVER_BTN).first().click();
  cy.get(TAKE_ACTION_POPOVER_BTN).should('be.visible');
  cy.get(CLOSE_SELECTED_ALERTS_BTN).click();
  cy.get(CLOSE_SELECTED_ALERTS_BTN).should('not.exist');
};

export const expandFirstAlertActions = () => {
  waitForAlerts();

  const togglePopover = () => {
    cy.get(TIMELINE_CONTEXT_MENU_BTN).first().should('be.visible');
    cy.get(TIMELINE_CONTEXT_MENU_BTN).first().click();
    cy.get(TIMELINE_CONTEXT_MENU_BTN)
      .first()
      .should('be.visible')
      .then(($btnEl) => {
        if ($btnEl.attr('data-popover-open') !== 'true') {
          cy.log(`${TIMELINE_CONTEXT_MENU_BTN} was flaky, attempting to re-open popover`);
          togglePopover();
        }
      });
  };
  togglePopover();
};

export const expandFirstAlert = () => {
  cy.get(EXPAND_ALERT_BTN).first().should('be.visible');
  // Cypress is flaky on clicking this button despite production not having that issue
  cy.get(EXPAND_ALERT_BTN).first().trigger('click');
};

export const hideMessageTooltip = () => {
  cy.get('body').then(($body) => {
    if ($body.find(TOOLTIP).length > 0) {
      cy.get(TOOLTIP).first().invoke('hide');
    }
  });
};

export const closeAlertFlyout = () => cy.get(CLOSE_FLYOUT).click();

export const viewThreatIntelTab = () => cy.get(THREAT_INTEL_TAB).click();

export const setEnrichmentDates = (from?: string, to?: string) => {
  cy.get(ENRICHMENT_QUERY_RANGE_PICKER).within(() => {
    if (from) {
      cy.get(ENRICHMENT_QUERY_START_INPUT).first().type(`{selectall}${from}{enter}`);
    }
    if (to) {
      cy.get(ENRICHMENT_QUERY_END_INPUT).type(`{selectall}${to}{enter}`);
    }
  });
  cy.get(UPDATE_ENRICHMENT_RANGE_BUTTON).click({ force: true });
};

export const refreshAlertPageFilter = () => {
  // Currently, system keeps the cache of option List for 1 minute so as to avoid
  // lot of unncessary traffic. Cypress is too fast and we cannot wait for a minute
  // to trigger a reload of Page Filters.
  // It is faster to refresh the page which will reload the Page Filter values
  // cy.reload();
  waitForAlerts();
};

export const togglePageFilterPopover = (filterIndex: number) => {
  cy.get(OPTION_LIST_VALUES(filterIndex)).click();
};

export const openPageFilterPopover = (filterIndex: number) => {
  cy.log(`Opening Page filter popover for index ${filterIndex}`);

  cy.get(OPTION_LIST_VALUES(filterIndex)).click();
  cy.get(OPTION_LIST_VALUES(filterIndex)).should('have.class', 'euiFilterButton-isSelected');
};

export const closePageFilterPopover = (filterIndex: number) => {
  cy.log(`Closing Page filter popover for index ${filterIndex}`);

  cy.get(OPTION_LIST_VALUES(filterIndex)).click();
  cy.get(OPTION_LIST_VALUES(filterIndex)).should('not.have.class', 'euiFilterButton-isSelected');
};

export const clearAllSelections = (filterIndex: number) => {
  cy.get(CONTROL_GROUP).scrollIntoView();
  recurse(
    () => {
      cy.get(CONTROL_FRAME_TITLE).eq(filterIndex).realHover();
      return cy.get(OPTION_LIST_CLEAR_BTN).eq(filterIndex);
    },
    ($el) => $el.is(':visible')
  );
  cy.get(OPTION_LIST_CLEAR_BTN).eq(filterIndex).should('be.visible').trigger('click');
};

export const selectPageFilterValue = (filterIndex: number, ...values: string[]) => {
  refreshAlertPageFilter();
  clearAllSelections(filterIndex);
  openPageFilterPopover(filterIndex);
  values.forEach((value) => {
    cy.get(OPTION_SELECTABLE(filterIndex, value)).click({ force: true });
  });
  closePageFilterPopover(filterIndex);
  waitForAlerts();
};

export const goToClosedAlertsOnRuleDetailsPage = () => {
  cy.get(CLOSED_ALERTS_FILTER_BTN).click();
  cy.get(REFRESH_BUTTON).should('not.have.attr', 'aria-label', 'Needs updating');
  cy.get(REFRESH_BUTTON).should('have.attr', 'aria-label', 'Refresh query');
  cy.get(TIMELINE_COLUMN_SPINNER).should('not.exist');
};

export const goToClosedAlerts = () => {
  // cy.get(CLOSED_ALERTS_FILTER_BTN).click();
  /*
   * below line commented because alertPageFiltersEnabled feature flag
   * is disabled by default
   * Target: enable by default in v8.8
   *
   * selectPageFilterValue(0, 'closed');
   *
   * */
  waitForPageFilters();
  selectPageFilterValue(0, 'closed');
  cy.get(REFRESH_BUTTON).should('not.have.attr', 'aria-label', 'Needs updating');
  cy.get(REFRESH_BUTTON).should('have.attr', 'aria-label', 'Refresh query');
  cy.get(TIMELINE_COLUMN_SPINNER).should('not.exist');
};

export const goToOpenedAlertsOnRuleDetailsPage = () => {
  cy.get(OPENED_ALERTS_FILTER_BTN).click({ force: true });
  cy.get(REFRESH_BUTTON).should('not.have.attr', 'aria-label', 'Needs updating');
  cy.get(REFRESH_BUTTON).should('have.attr', 'aria-label', 'Refresh query');
};

export const goToOpenedAlerts = () => {
  // cy.get(OPENED_ALERTS_FILTER_BTN).click({ force: true });
  /*
   * below line commented because alertPageFiltersEnabled feature flag
   * is disabled by default
   * Target: enable by default in v8.8
   *
   * selectPageFilterValue(0, 'open');
   *
   */
  selectPageFilterValue(0, 'open');
  cy.get(REFRESH_BUTTON).should('not.have.attr', 'aria-label', 'Needs updating');
  cy.get(REFRESH_BUTTON).should('have.attr', 'aria-label', 'Refresh query');
};

export const openFirstAlert = () => {
  expandFirstAlertActions();
  cy.get(OPEN_ALERT_BTN).should('be.visible');
  cy.get(OPEN_ALERT_BTN).click();
};

export const openAlerts = () => {
  cy.get(TAKE_ACTION_POPOVER_BTN).click({ force: true });
  cy.get(OPEN_ALERT_BTN).click();
};

export const selectCountTable = () => {
  cy.get(SELECT_AGGREGATION_CHART).click({ force: true });
};

export const selectAlertsHistogram = () => {
  cy.get(SELECT_HISTOGRAM).click();
};

export const goToAcknowledgedAlerts = () => {
  /*
   * below line commented because alertPageFiltersEnabled feature flag
   * is disabled by default
   * Target: enable by default in v8.8
   *
   * selectPageFilterValue(0, 'acknowledged');
   *
   */
  // cy.get(ACKNOWLEDGED_ALERTS_FILTER_BTN).click();
  selectPageFilterValue(0, 'acknowledged');
  cy.get(REFRESH_BUTTON).should('not.have.attr', 'aria-label', 'Needs updating');
  cy.get(REFRESH_BUTTON).should('have.attr', 'aria-label', 'Refresh query');
  cy.get(TIMELINE_COLUMN_SPINNER).should('not.exist');
};

export const markAlertsAcknowledged = () => {
  cy.get(TAKE_ACTION_POPOVER_BTN).click({ force: true });
  cy.get(MARK_ALERT_ACKNOWLEDGED_BTN).should('be.visible');
  cy.get(MARK_ALERT_ACKNOWLEDGED_BTN).click();
};

export const markAcknowledgedFirstAlert = () => {
  expandFirstAlertActions();
  cy.get(MARK_ALERT_ACKNOWLEDGED_BTN).should('be.visible');
  cy.get(MARK_ALERT_ACKNOWLEDGED_BTN).click();
};

export const openAlertsFieldBrowser = () => {
  cy.get(FIELDS_BROWSER_BTN).click();
};

export const selectNumberOfAlerts = (numberOfAlerts: number) => {
  for (let i = 0; i < numberOfAlerts; i++) {
    waitForAlerts();
    cy.get(ALERT_CHECKBOX).eq(i).as('checkbox').click({ force: true });
    cy.get('@checkbox').should('have.attr', 'checked');
  }
};

export const investigateFirstAlertInTimeline = () => {
  cy.get(SEND_ALERT_TO_TIMELINE_BTN).first().click({ force: true });
};

export const openAnalyzerForFirstAlertInTimeline = () => {
  cy.get(OPEN_ANALYZER_BTN).first().click({ force: true });
};

export const clickAlertsHistogramLegend = () => {
  cy.get(ALERTS_HISTOGRAM_LEGEND).click();
};

export const clickAlertsHistogramLegendAddToTimeline = (ruleName: string) => {
  cy.get(LEGEND_ACTIONS.ADD_TO_TIMELINE(ruleName)).click();
};

export const clickAlertsHistogramLegendFilterOut = (ruleName: string) => {
  cy.get(LEGEND_ACTIONS.FILTER_OUT(ruleName)).click();
};

export const clickAlertsHistogramLegendFilterFor = (ruleName: string) => {
  cy.get(LEGEND_ACTIONS.FILTER_FOR(ruleName)).click();
};

const clickAction = (propertySelector: string, rowIndex: number, actionSelector: string) => {
  recurse(
    () => {
      // To clear focus
      cy.get('body').type('{esc}');
      cy.get(propertySelector).eq(rowIndex).realHover();
      return cy.get(actionSelector).first();
    },
    ($el) => $el.is(':visible')
  );

  cy.get(actionSelector).first().click();
};
export const clickExpandActions = (propertySelector: string, rowIndex: number) => {
  clickAction(propertySelector, rowIndex, ACTIONS_EXPAND_BUTTON);
};
export const addAlertPropertyToTimeline = (propertySelector: string, rowIndex: number) => {
  clickAction(propertySelector, rowIndex, CELL_ADD_TO_TIMELINE_BUTTON);
};
export const filterForAlertProperty = (propertySelector: string, rowIndex: number) => {
  clickAction(propertySelector, rowIndex, CELL_FILTER_IN_BUTTON);
};
export const filterOutAlertProperty = (propertySelector: string, rowIndex: number) => {
  clickAction(propertySelector, rowIndex, CELL_FILTER_OUT_BUTTON);
};

export const showTopNAlertProperty = (propertySelector: string, rowIndex: number) => {
  recurse(
    () => {
      clickExpandActions(propertySelector, rowIndex);
      return cy.get(CELL_SHOW_TOP_FIELD_BUTTON).first();
    },
    ($el) => $el.is(':visible')
  );

  hideMessageTooltip();

  cy.get(CELL_SHOW_TOP_FIELD_BUTTON).first().should('be.visible').click();
};

export const waitForAlerts = () => {
  /*
   * below line commented because alertpagefiltersenabled feature flag
   * is disabled by default
   * target: enable by default in v8.8
   *
   * waitforpagefilters();
   *
   * */
  waitForPageFilters();
  cy.get(REFRESH_BUTTON).should('not.have.attr', 'aria-label', 'Needs updating');
  cy.get(DATAGRID_CHANGES_IN_PROGRESS).should('not.be.true');
  cy.get(EVENT_CONTAINER_TABLE_LOADING).should('not.exist');
  cy.get(LOADING_INDICATOR).should('not.exist');
};

export const expandAlertTableCellValue = (columnSelector: string, row = 1) => {
  cy.get(columnSelector).eq(1).realHover();
  cy.get(columnSelector).eq(1).find(CELL_EXPAND_VALUE).click();
};

export const scrollAlertTableColumnIntoView = (columnSelector: string) => {
  cy.get(columnSelector).eq(0).scrollIntoView();

  // Wait for data grid to populate column
  cy.waitUntil(() => cy.get(columnSelector).then(($el) => $el.length > 1), {
    interval: 500,
    timeout: 12000,
  });
};

export const waitForPageFilters = () => {
  cy.log('Waiting for Page Filters');
  cy.url().then((urlString) => {
    const url = new URL(urlString);
    if (url.pathname.endsWith(ALERTS_URL)) {
      // since these are only valid on the alert page
      cy.get(DETECTION_PAGE_FILTER_GROUP_WRAPPER).should('exist');
      cy.get(DETECTION_PAGE_FILTER_GROUP_LOADING).should('not.exist');
      cy.get(DETECTION_PAGE_FILTERS_LOADING).should('not.exist');
      cy.get(OPTION_LISTS_LOADING).should('have.lengthOf', 0);
    } else {
      cy.log('Skipping Page Filters Wait');
    }
  });
};

export const resetFilters = () => {
  openFilterGroupContextMenu();
  cy.get(DETECTION_PAGE_FILTER_GROUP_RESET_BUTTON).trigger('click');
  waitForPageFilters();
  cy.log('Resetting filters complete');
};

export const parseAlertsCountToInt = (count: string | number) =>
  typeof count === 'number' ? count : parseInt(count, 10);

export const sumAlertCountFromAlertCountTable = (callback?: (sumOfEachRow: number) => void) => {
  let sumOfEachRow = 0;
  const alertCountColumn = ALERT_COUNT_TABLE_COLUMN(3);

  cy.get(ALERT_EMBEDDABLE_PROGRESS_BAR)
    .should('not.exist')
    .then(() => {
      // eslint-disable-next-line cypress/unsafe-to-chain-command
      cy.get(alertCountColumn)
        .each((row) => {
          sumOfEachRow += parseInt(row.text(), 10);
        })
        .then(() => {
          callback?.(sumOfEachRow);
        });
    });
};

export const selectFirstPageAlerts = () => {
  const ALERTS_DATA_GRID = '[data-test-subj="alertsTable"]';
  cy.get(ALERTS_DATA_GRID).find(SELECT_ALL_VISIBLE_ALERTS).scrollIntoView();
  cy.get(ALERTS_DATA_GRID).find(SELECT_ALL_VISIBLE_ALERTS).click({ force: true });
};

export const selectAllAlerts = () => {
  selectFirstPageAlerts();
  cy.get(SELECT_ALL_ALERTS).click();
};

export const visitAlertsPageWithCustomFilters = (pageFilters: FilterItemObj[]) => {
  const pageFilterUrlVal = encode(formatPageFilterSearchParam(pageFilters));
  const newURL = `${ALERTS_URL}?pageFilters=${pageFilterUrlVal}`;
  visitWithTimeRange(newURL);
};

export const openSessionViewerFromAlertTable = (rowIndex: number = 0) => {
  cy.get(SESSION_VIEWER_BUTTON).eq(rowIndex).click();
};

export const openAlertTaggingBulkActionMenu = () => {
  cy.get(TAKE_ACTION_POPOVER_BTN).click();
  cy.get(ALERT_TAGGING_CONTEXT_MENU_ITEM).click();
};

export const clickAlertTag = (tag: string) => {
  cy.get(ALERT_TAGGING_CONTEXT_MENU).contains(tag).click();
};

export const updateAlertTags = () => {
  cy.get(ALERT_TAGGING_UPDATE_BUTTON).click();
};

export const showHoverActionsEventRenderedView = (fieldSelector: string) => {
  cy.get(fieldSelector).first().trigger('mouseover');
  cy.get(HOVER_ACTIONS_CONTAINER).should('be.visible');
};

export const waitForTopNHistogramToLoad = () => {
  cy.get(ALERTS_HISTOGRAM_PANEL_LOADER).should('exist');
  cy.get(ALERTS_HISTOGRAM_PANEL_LOADER).should('not.exist');
};

export const switchAlertTableToEventRenderedView = () => {
  cy.get(ALERT_TABLE_SUMMARY_VIEW_SELECTABLE).should('be.visible').trigger('click');
  cy.get(ALERT_TABLE_EVENT_RENDERED_VIEW_OPTION).should('be.visible').trigger('click');
};

export const switchAlertTableToGridView = () => {
  cy.get(ALERT_TABLE_SUMMARY_VIEW_SELECTABLE).should('be.visible').trigger('click');
  cy.get(ALERT_TABLE_GRID_VIEW_OPTION).should('be.visible').trigger('click');
};
