/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { WebElementWrapper } from 'test/functional/services/lib/web_element_wrapper';
import { FtrProviderContext } from '../ftr_provider_context';

interface Node {
  circle: WebElementWrapper;
  label: string;
}

interface Edge {
  sourceNode: Node;
  targetNode: Node;
  width: number;
  element: WebElementWrapper;
}

export function GraphPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const find = getService('find');
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'header', 'settings']);
  const retry = getService('retry');

  class GraphPage {
    async selectIndexPattern(pattern: string) {
      await testSubjects.click(`savedObjectTitle${pattern.split(' ').join('-')}`);
    }

    async clickAddField() {
      await testSubjects.click('graph-add-field-button');
    }

    async selectField(field: string) {
      await testSubjects.setValue('graph-field-search', field);
      await find.clickDisplayedByCssSelector(`[title="${field}"]`);
    }

    async addFields(fields: string[]) {
      log.debug('click Add Field icon');
      await this.clickAddField();
      for (const field of fields) {
        log.debug('select field ' + field);
        await this.selectField(field);
      }
    }

    async query(str: string) {
      await testSubjects.click('queryInput');
      await testSubjects.setValue('queryInput', str);
      await testSubjects.click('graph-explore-button');
    }

    private getPositionAsString(x: string, y: string) {
      return `${x}-${y}`;
    }

    private async getCirclePosition(element: WebElementWrapper) {
      const x = await element.getAttribute('cx');
      const y = await element.getAttribute('cy');
      return this.getPositionAsString(x, y);
    }

    private async getLinePositions(element: WebElementWrapper) {
      const x1 = await element.getAttribute('x1');
      const y1 = await element.getAttribute('y1');
      const x2 = await element.getAttribute('x2');
      const y2 = await element.getAttribute('y2');
      return [this.getPositionAsString(x1, y1), this.getPositionAsString(x2, y2)];
    }

    async isolateEdge(edge: Edge) {
      const from = edge.sourceNode.label;
      const to = edge.targetNode.label;

      // select all nodes
      await testSubjects.click('graphSelectAll');

      // go through all nodes and remove every node not source or target
      const selections = await find.allByCssSelector('.gphSelectionList__field');
      for (const selection of selections) {
        const labelElement = await selection.findByTagName('span');
        const selectionLabel = await labelElement.getVisibleText();
        log.debug('Looking at selection ' + selectionLabel);
        if (selectionLabel !== from && selectionLabel !== to) {
          (await selection.findByClassName('gphNode__text')).click();
          await PageObjects.common.sleep(200);
        }
      }

      // invert selection to select all nodes not source or target
      await testSubjects.click('graphInvertSelection');

      // remove all other nodes
      await testSubjects.click('graphRemoveSelection');
    }

    async clickEdge(edge: Edge) {
      await this.stopLayout();
      await PageObjects.common.sleep(1000);
      await edge.element.click();
      await this.startLayout();
    }

    async stopLayout() {
      if (await testSubjects.exists('graphPauseLayout')) {
        await testSubjects.click('graphPauseLayout');
      }
    }

    async startLayout() {
      if (await testSubjects.exists('graphResumeLayout')) {
        await testSubjects.click('graphResumeLayout');
      }
    }

    async getGraphObjects() {
      await this.stopLayout();
      const graphElements = await find.allByCssSelector(
        '#svgRootGroup line, #svgRootGroup circle, text.gphNode__label'
      );
      const nodes: Node[] = [];
      const nodePositionMap: Record<string, number> = {};
      const edges: Edge[] = [];

      // find all nodes and save their positions
      for (const element of graphElements) {
        const tagName: string = await element.getTagName();
        // check the position of the circle element
        if (tagName === 'circle') {
          nodes.push({ circle: element, label: '' });
          const position = await this.getCirclePosition(element);
          nodePositionMap[position] = nodes.length - 1;
        }
        // get the label for the node from the text element
        if (tagName === 'text') {
          const text = await element.getVisibleText();
          nodes[nodes.length - 1].label = text;
        }
      }

      // find all edges
      for (const element of graphElements) {
        const tagName: string = await element.getTagName();
        if (tagName === 'line') {
          const [sourcePosition, targetPosition] = await this.getLinePositions(element);
          const lineStyle = await element.getAttribute('style');
          // grep out the width of the connection from the style attribute
          const strokeWidth = Number(/stroke-width: (\d+(\.\d+)?)px/.exec(lineStyle)![1]);
          edges.push({
            element,
            width: strokeWidth,
            // look up source and target node by matching start and end coordinates
            // of the edges and the nodes
            sourceNode: nodes[nodePositionMap[sourcePosition]],
            targetNode: nodes[nodePositionMap[targetPosition]],
          });
        }
      }

      await this.startLayout();

      return {
        nodes,
        edges,
      };
    }

    async createWorkspace() {
      await testSubjects.click('graphCreateWorkspacePromptButton');
    }

    async newGraph() {
      log.debug('Click New Workspace');
      await retry.try(async () => {
        await testSubjects.click('graphNewButton');
        await testSubjects.existOrFail('confirmModal', { timeout: 3000 });
      });
      await PageObjects.common.clickConfirmOnModal();
      // wait for route change to complete
      await PageObjects.common.sleep(3000);
    }

    async saveGraph(name: string) {
      await retry.try(async () => {
        await testSubjects.click('graphSaveButton');
        await testSubjects.existOrFail('savedObjectTitle', { timeout: 3000 });
      });
      await testSubjects.setValue('savedObjectTitle', name);
      await testSubjects.click('confirmSaveSavedObjectButton');

      // Confirm that the Graph has been saved.
      return await testSubjects.exists('saveGraphSuccess');
    }

    async getSearchFilter() {
      const searchFilter = await find.allByCssSelector('.euiFieldSearch');
      return searchFilter[0];
    }

    async searchForWorkspaceWithName(name: string) {
      await retry.try(async () => {
        const searchFilter = await this.getSearchFilter();
        await searchFilter.clearValue();
        await searchFilter.click();
        await searchFilter.type(name);
        await PageObjects.common.pressEnterKey();
        await find.waitForDeletedByCssSelector('.euiBasicTable-loading', 5000);
      });

      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async goToListingPage() {
      await retry.try(async () => {
        await testSubjects.click('breadcrumb graphHomeBreadcrumb first');
        await testSubjects.existOrFail('workspaceLandingPage', { timeout: 3000 });
      });
    }

    async openGraph(name: string) {
      await this.goToListingPage();
      await this.searchForWorkspaceWithName(name);
      await find.clickByLinkText(name);
      await PageObjects.common.sleep(5000);
    }

    async deleteGraph(name: string) {
      await this.searchForWorkspaceWithName(name);
      await testSubjects.click('checkboxSelectAll');
      await this.clickDeleteSelectedWorkspaces();
      await PageObjects.common.clickConfirmOnModal();
    }

    async getWorkspaceCount() {
      const workspaceTitles = await find.allByCssSelector(
        '[data-test-subj^="graphListingTitleLink"]'
      );
      return workspaceTitles.length;
    }

    async clickDeleteSelectedWorkspaces() {
      await testSubjects.click('deleteSelectedItems');
    }

    async getVennTerm1() {
      const el = await find.byCssSelector('span.gphLinkSummary__term--1');
      return await el.getVisibleText();
    }

    async getVennTerm2() {
      const el = await find.byCssSelector('span.gphLinkSummary__term--2');
      return await el.getVisibleText();
    }

    async getSmallVennTerm1() {
      const el = await find.byCssSelector('small.gphLinkSummary__term--1');
      return await el.getVisibleText();
    }

    async getSmallVennTerm12() {
      const el = await find.byCssSelector('small.gphLinkSummary__term--1-2');
      return await el.getVisibleText();
    }

    async getSmallVennTerm2() {
      const el = await find.byCssSelector('small.gphLinkSummary__term--2');
      return await el.getVisibleText();
    }
  }
  return new GraphPage();
}
