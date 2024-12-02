/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import type { FilterBarService } from '@kbn/test-suites-src/functional/services/filter_bar';
import { FtrService } from '../../functional/ftr_provider_context';

const GRAPH_PREVIEW_TITLE_LINK_TEST_ID = 'securitySolutionFlyoutGraphPreviewTitleLink';
const GRAPH_VISUALIZATION_TEST_ID = 'securitySolutionFlyoutGraphVisualization';
const NODE_EXPAND_BUTTON_TEST_ID = 'nodeExpandButton';
const GRAPH_NODE_EXPAND_POPOVER_TEST_ID = `${GRAPH_VISUALIZATION_TEST_ID}GraphNodeExpandPopover`;
const GRAPH_NODE_POPOVER_EXPLORE_RELATED_TEST_ID = `${GRAPH_VISUALIZATION_TEST_ID}ExploreRelatedEntities`;
const GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_TEST_ID = `${GRAPH_VISUALIZATION_TEST_ID}ShowActionsByEntity`;
const GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_TEST_ID = `${GRAPH_VISUALIZATION_TEST_ID}ShowActionsOnEntity`;
type Filter = Parameters<FilterBarService['addFilter']>[0];

export class ExpandedFlyout extends FtrService {
  private readonly pageObjects = this.ctx.getPageObjects(['common', 'header']);
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly filterBar = this.ctx.getService('filterBar');

  async expandGraph(): Promise<void> {
    await this.testSubjects.click(GRAPH_PREVIEW_TITLE_LINK_TEST_ID);
  }

  async waitGraphIsLoaded(): Promise<void> {
    await this.testSubjects.existOrFail(GRAPH_VISUALIZATION_TEST_ID, { timeout: 10000 });
  }

  async assertGraphNodesNumber(expected: number): Promise<void> {
    await this.waitGraphIsLoaded();
    const graph = await this.testSubjects.find(GRAPH_VISUALIZATION_TEST_ID);
    await graph.scrollIntoView();
    const nodes = await graph.findAllByCssSelector('.react-flow__nodes .react-flow__node');
    expect(nodes.length).to.be(expected);
  }

  async selectNode(nodeId: string): Promise<WebElementWrapper> {
    await this.waitGraphIsLoaded();
    const graph = await this.testSubjects.find(GRAPH_VISUALIZATION_TEST_ID);
    await graph.scrollIntoView();
    const nodes = await graph.findAllByCssSelector(
      `.react-flow__nodes .react-flow__node[data-id="${nodeId}"]`
    );
    expect(nodes.length).to.be(1);
    await nodes[0].moveMouseTo();
    return nodes[0];
  }

  async clickOnNodeExpandButton(nodeId: string): Promise<void> {
    const node = await this.selectNode(nodeId);
    const expandButton = await node.findByTestSubject(NODE_EXPAND_BUTTON_TEST_ID);
    await expandButton.click();
    await this.testSubjects.existOrFail(GRAPH_NODE_EXPAND_POPOVER_TEST_ID);
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

  async exploreRelatedEntities(nodeId: string): Promise<void> {
    await this.clickOnNodeExpandButton(nodeId);
    await this.testSubjects.click(GRAPH_NODE_POPOVER_EXPLORE_RELATED_TEST_ID);
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
    await this.testSubjects.click(`${GRAPH_VISUALIZATION_TEST_ID} > showQueryBarMenu`);
    await this.testSubjects.click('filter-sets-removeAllFilters');
    await this.pageObjects.header.waitUntilLoadingHasFinished();
  }

  async addFilter(filter: Filter): Promise<void> {
    await this.testSubjects.click(`${GRAPH_VISUALIZATION_TEST_ID} > addFilter`);
    await this.filterBar.createFilter(filter);
    await this.testSubjects.scrollIntoView('saveFilter');
    await this.testSubjects.clickWhenNotDisabled('saveFilter');
    await this.pageObjects.header.waitUntilLoadingHasFinished();
  }
}
