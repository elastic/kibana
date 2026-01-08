/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { GenericFtrService } from '@kbn/test';
import type { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import type { FilterBarService } from '@kbn/test-suites-src/functional/services/filter_bar';
import type { QueryBarProvider } from '../services/query_bar_provider';
import type { SecurityTelemetryFtrProviderContext } from '../config';
import { testSubjectIds } from '../constants/test_subject_ids';

const {
  GRAPH_PREVIEW_TITLE_LINK_TEST_ID,
  NODE_EXPAND_BUTTON_TEST_ID,
  GRAPH_INVESTIGATION_TEST_ID,
  GRAPH_NODE_EXPAND_POPOVER_TEST_ID,
  GRAPH_NODE_POPOVER_EXPLORE_RELATED_TEST_ID,
  GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_TEST_ID,
  GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_TEST_ID,
  GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID,
  GRAPH_LABEL_EXPAND_POPOVER_TEST_ID,
  GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID,
  GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID,
  GRAPH_ACTIONS_TOGGLE_SEARCH_ID,
  GRAPH_ACTIONS_INVESTIGATE_IN_TIMELINE_ID,
  GRAPH_CONTROL_FIT_TO_VIEW_TEST_ID,
  GRAPH_IPS_PLUS_COUNT_BUTTON_ID,
  GRAPH_IPS_POPOVER_ID,
  GRAPH_IPS_POPOVER_CONTENT_ID,
  GRAPH_IPS_POPOVER_IP_ID,
  PREVIEW_SECTION_BANNER_PANEL,
  GRAPH_GROUPED_NODE_TEST_ID,
  GRAPH_CALLOUT_TEST_ID,
  GRAPH_NODE_ENTITY_DETAILS_ID,
  GRAPH_NODE_ENTITY_TAG_TEXT_ID,
  GROUPED_ITEM_TITLE_TEST_ID_TEXT,
  GROUPED_ITEM_TITLE_TEST_ID_LINK,
  GROUPED_ITEM_TEST_ID,
  GROUPED_ITEM_ACTOR_TEST_ID,
  GROUPED_ITEM_TARGET_TEST_ID,
  PREVIEW_SECTION_CLOSE_BUTTON_TEST_ID,
  PREVIEW_SECTION_TEST_ID,
} = testSubjectIds;

type Filter = Parameters<FilterBarService['addFilter']>[0];

export class ExpandedFlyoutGraph extends GenericFtrService<SecurityTelemetryFtrProviderContext> {
  private readonly pageObjects = this.ctx.getPageObjects(['common', 'header']);
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly filterBar = this.ctx.getService('filterBar');

  async expandGraph(): Promise<void> {
    await this.testSubjects.click(GRAPH_PREVIEW_TITLE_LINK_TEST_ID);
  }

  async waitGraphIsLoaded(): Promise<void> {
    await this.testSubjects.existOrFail(GRAPH_INVESTIGATION_TEST_ID, { timeout: 10000 });
  }

  async assertGraphNodesNumber(expected: number): Promise<void> {
    await this.waitGraphIsLoaded();
    const graph = await this.testSubjects.find(GRAPH_INVESTIGATION_TEST_ID);
    await graph.scrollIntoView();
    const nodes = await graph.findAllByCssSelector('.react-flow__nodes .react-flow__node');
    expect(nodes.length).to.be(expected);
  }

  async assertGraphGroupNodesNumber(expected: number): Promise<void> {
    await this.waitGraphIsLoaded();
    const graph = await this.testSubjects.find(GRAPH_INVESTIGATION_TEST_ID);
    await graph.scrollIntoView();
    const nodes = await graph.findAllByTestSubject(GRAPH_GROUPED_NODE_TEST_ID);
    expect(nodes.length).to.be(expected);
  }

  async toggleSearchBar(): Promise<void> {
    await this.testSubjects.click(GRAPH_ACTIONS_TOGGLE_SEARCH_ID);
  }

  async showSearchBar(): Promise<void> {
    const isSearchBarVisible = await this.testSubjects.exists(
      `${GRAPH_INVESTIGATION_TEST_ID} > addFilter`
    );
    if (!isSearchBarVisible) {
      await this.testSubjects.click(GRAPH_ACTIONS_TOGGLE_SEARCH_ID);
    }
  }

  async selectNode(nodeId: string): Promise<WebElementWrapper> {
    await this.waitGraphIsLoaded();
    const graph = await this.testSubjects.find(GRAPH_INVESTIGATION_TEST_ID);
    await graph.scrollIntoView();
    const nodes = await graph.findAllByCssSelector(
      `.react-flow__nodes .react-flow__node[data-id="${nodeId}"]`
    );
    expect(nodes.length).to.be(1);
    await nodes[0].moveMouseTo();
    return nodes[0];
  }

  async clickOnNodeExpandButton(
    nodeId: string,
    popoverId: string = GRAPH_NODE_EXPAND_POPOVER_TEST_ID
  ): Promise<void> {
    const node = await this.selectNode(nodeId);
    const expandButton = await node.findByTestSubject(NODE_EXPAND_BUTTON_TEST_ID);
    await expandButton.click();
    await this.testSubjects.existOrFail(popoverId);
  }

  async showActionsByEntity(nodeId: string): Promise<void> {
    await this.clickOnNodeExpandButton(nodeId);
    await this.testSubjects.click(GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_TEST_ID);
    await this.pageObjects.header.waitUntilLoadingHasFinished();
  }

  async showActionsOnEntity(nodeId: string): Promise<void> {
    await this.clickOnNodeExpandButton(nodeId);
    await this.testSubjects.click(GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_TEST_ID);
    await this.pageObjects.header.waitUntilLoadingHasFinished();
  }

  async showEntityDetails(nodeId: string): Promise<void> {
    await this.clickOnNodeExpandButton(nodeId);
    await this.testSubjects.click(GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID);
    await this.pageObjects.header.waitUntilLoadingHasFinished();
  }

  async hideActionsOnEntity(nodeId: string): Promise<void> {
    await this.clickOnNodeExpandButton(nodeId);
    const btnText = await this.testSubjects.getVisibleText(
      GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_TEST_ID
    );
    expect(btnText).to.be('Hide actions done to this entity');
    await this.testSubjects.click(GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_TEST_ID);
    await this.pageObjects.header.waitUntilLoadingHasFinished();
  }

  async exploreRelatedEntities(nodeId: string): Promise<void> {
    await this.clickOnNodeExpandButton(nodeId);
    await this.testSubjects.click(GRAPH_NODE_POPOVER_EXPLORE_RELATED_TEST_ID);
    await this.pageObjects.header.waitUntilLoadingHasFinished();
  }

  async showEventsOfSameAction(nodeId: string): Promise<void> {
    await this.clickOnNodeExpandButton(nodeId, GRAPH_LABEL_EXPAND_POPOVER_TEST_ID);
    await this.testSubjects.click(GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID);
    await this.pageObjects.header.waitUntilLoadingHasFinished();
  }

  async showEventOrAlertDetails(nodeId: string): Promise<void> {
    await this.clickOnNodeExpandButton(nodeId, GRAPH_LABEL_EXPAND_POPOVER_TEST_ID);
    await this.testSubjects.click(GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID);
    await this.pageObjects.header.waitUntilLoadingHasFinished();
  }

  async hideEventsOfSameAction(nodeId: string): Promise<void> {
    await this.clickOnNodeExpandButton(nodeId, GRAPH_LABEL_EXPAND_POPOVER_TEST_ID);
    const btnText = await this.testSubjects.getVisibleText(
      GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID
    );
    expect(btnText).to.be('Hide related events');
    await this.testSubjects.click(GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID);
    await this.pageObjects.header.waitUntilLoadingHasFinished();
  }

  async expectFilterTextEquals(filterIdx: number, expected: string): Promise<void> {
    const filters = await this.filterBar.getFiltersLabel();
    expect(filters.length).to.be.greaterThan(filterIdx);
    expect(filters[filterIdx]).to.be(expected);
  }

  async expectFilterPreviewEquals(filterIdx: number, expected: string): Promise<void> {
    await this.clickEditFilter(filterIdx);

    const filterPreview = await this.filterBar.getFilterEditorPreview();
    expect(filterPreview).to.be(expected);

    await this.filterBar.ensureFieldEditorModalIsClosed();
  }

  async clickEditFilter(filterIdx: number): Promise<void> {
    await this.filterBar.clickEditFilterById(filterIdx.toString());
  }

  async clearAllFilters(): Promise<void> {
    await this.testSubjects.click(`${GRAPH_INVESTIGATION_TEST_ID} > showQueryBarMenu`);
    await this.testSubjects.click('filter-sets-removeAllFilters');
    await this.pageObjects.header.waitUntilLoadingHasFinished();
  }

  async addFilter(filter: Filter): Promise<void> {
    await this.testSubjects.click(`${GRAPH_INVESTIGATION_TEST_ID} > addFilter`);
    await this.filterBar.createFilter(filter);
    await this.testSubjects.scrollIntoView('saveFilter');
    await this.testSubjects.clickWhenNotDisabled('saveFilter');
    await this.pageObjects.header.waitUntilLoadingHasFinished();
  }

  async clickOnInvestigateInTimelineButton(): Promise<void> {
    await this.testSubjects.click(GRAPH_ACTIONS_INVESTIGATE_IN_TIMELINE_ID);
    await this.pageObjects.header.waitUntilLoadingHasFinished();
  }

  async setKqlQuery(kql: string): Promise<void> {
    const queryBarProvider: QueryBarProvider = this.ctx.getService('queryBarProvider');

    const queryBar = queryBarProvider.getQueryBar(GRAPH_INVESTIGATION_TEST_ID);
    await queryBar.setQuery(kql);
    await queryBar.submitQuery();
    await this.pageObjects.header.waitUntilLoadingHasFinished();
  }

  async clickOnFitGraphIntoViewControl(): Promise<void> {
    await this.testSubjects.click(GRAPH_CONTROL_FIT_TO_VIEW_TEST_ID);
    await this.pageObjects.header.waitUntilLoadingHasFinished();
  }

  async clickOnIpsPlusButton(): Promise<void> {
    const ipsPlusButton = await this.testSubjects.find(GRAPH_IPS_PLUS_COUNT_BUTTON_ID);
    await ipsPlusButton.click();
  }

  async assertIpsPopoverIsOpen(): Promise<void> {
    await this.testSubjects.existOrFail(GRAPH_IPS_POPOVER_ID);
    await this.testSubjects.existOrFail(GRAPH_IPS_POPOVER_CONTENT_ID);
  }

  async clickOnFirstIpInPopover(): Promise<void> {
    await this.testSubjects.existOrFail(GRAPH_IPS_POPOVER_CONTENT_ID);
    const popoverContent = await this.testSubjects.find(GRAPH_IPS_POPOVER_CONTENT_ID);
    const firstIpElement = await popoverContent.findByTestSubject(GRAPH_IPS_POPOVER_IP_ID);
    await firstIpElement.click();
  }

  async assertPreviewPopoverIsOpen(): Promise<void> {
    await this.testSubjects.existOrFail(PREVIEW_SECTION_BANNER_PANEL);
  }

  async assertIpsPopoverContainsIps(expectedIps: string[]): Promise<void> {
    await this.testSubjects.existOrFail(GRAPH_IPS_POPOVER_CONTENT_ID);
    const popoverContent = await this.testSubjects.find(GRAPH_IPS_POPOVER_CONTENT_ID);

    for (const expectedIp of expectedIps) {
      const ipText = await popoverContent.getVisibleText();
      expect(ipText).to.contain(expectedIp);
    }
  }

  async assertCalloutVisible(): Promise<void> {
    await this.testSubjects.existOrFail(GRAPH_CALLOUT_TEST_ID, {
      timeout: 10000,
    });
  }

  async dismissCallout(): Promise<void> {
    const callout = await this.testSubjects.find(GRAPH_CALLOUT_TEST_ID);
    const dismissButton = await callout.findByTestSubject('euiDismissCalloutButton');
    await dismissButton.click();
    await this.testSubjects.missingOrFail(GRAPH_CALLOUT_TEST_ID);
  }

  async assertNodeEntityTag(nodeId: string, expectedTagValue: string): Promise<void> {
    const node = await this.selectNode(nodeId);
    const tagWrapper = await node.findByTestSubject(GRAPH_NODE_ENTITY_TAG_TEXT_ID);
    const tagText = await tagWrapper.getVisibleText();
    expect(tagText.toLowerCase()).to.contain(expectedTagValue.toLowerCase());
  }

  async assertNodeEntityDetails(nodeId: string, expectedDetails: string): Promise<void> {
    const node = await this.selectNode(nodeId);
    const detailsElement = await node.findByTestSubject(GRAPH_NODE_ENTITY_DETAILS_ID);
    const fullTextElement = await detailsElement.findByTestSubject('fullText');
    const detailsText = await fullTextElement.getVisibleText();
    expect(detailsText).to.be(expectedDetails);
  }

  async assertPreviewPanelGroupedItemTitleTextNumber(expected: number): Promise<void> {
    await this.testSubjects.existOrFail(PREVIEW_SECTION_TEST_ID, { timeout: 10000 });
    const titleTextElements = await this.testSubjects.findAll(GROUPED_ITEM_TITLE_TEST_ID_TEXT);
    expect(titleTextElements.length).to.be(expected);
  }

  async assertPreviewPanelGroupedItemTitleLinkNumber(expected: number): Promise<void> {
    await this.testSubjects.existOrFail(PREVIEW_SECTION_TEST_ID, { timeout: 10000 });
    const groupedItems = await this.testSubjects.findAll(GROUPED_ITEM_TITLE_TEST_ID_LINK);
    expect(groupedItems.length).to.be(expected);
  }

  async closePreviewSection(): Promise<void> {
    await this.testSubjects.click(PREVIEW_SECTION_CLOSE_BUTTON_TEST_ID);
  }

  async assertGroupedItemActorAndTargetValues(
    expectedCount: number,
    actor: string,
    target: string
  ): Promise<void> {
    await this.testSubjects.existOrFail(PREVIEW_SECTION_TEST_ID, { timeout: 10000 });
    const groupedItems = await this.testSubjects.findAll(GROUPED_ITEM_TEST_ID);
    expect(groupedItems.length).to.be.greaterThan(0);

    // Count how many grouped items have the specified actor and target
    let matchingCount = 0;
    for (const groupedItem of groupedItems) {
      try {
        const actorElement = await groupedItem.findByTestSubject(GROUPED_ITEM_ACTOR_TEST_ID);
        const targetElement = await groupedItem.findByTestSubject(GROUPED_ITEM_TARGET_TEST_ID);

        const actorText = await actorElement.getVisibleText();
        const targetText = await targetElement.getVisibleText();

        if (actorText.includes(actor) && targetText.includes(target)) {
          matchingCount++;
        }
      } catch (e) {
        // This grouped item might not have actor/target (could be an entity), continue checking others
        continue;
      }
    }

    expect(matchingCount).to.be(expectedCount);
  }
}
