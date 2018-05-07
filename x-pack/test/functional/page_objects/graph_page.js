/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function GraphPageProvider({ getService, getPageObjects }) {
  const remote = getService('remote');
  const config = getService('config');
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const defaultFindTimeout = config.get('timeouts.find');
  const PageObjects = getPageObjects(['common', 'header', 'settings']);
  const retry = getService('retry');


  class GraphPage {

    async selectIndexPattern(pattern) {
      await remote.setFindTimeout(defaultFindTimeout).findDisplayedByCssSelector('.indexDropDown').click();
      await remote.setFindTimeout(defaultFindTimeout).findByCssSelector('.indexDropDown > option[label="' + pattern + '"]').click();
    }

    async clickAddField() {
      await retry.try(async () => {
        await remote.setFindTimeout(defaultFindTimeout).findById('addVertexFieldButton')
          .click();
        // make sure the fieldSelectionList is not hidden
        await remote.setFindTimeout(defaultFindTimeout).findDisplayedByCssSelector('[data-test-subj="fieldSelectionList"]');
      });
    }

    async selectField(field) {
      await remote.setFindTimeout(defaultFindTimeout).findDisplayedByCssSelector('select[id="fieldList"] > option[label="' + field + '"]')
        .click();
      await remote.setFindTimeout(defaultFindTimeout).findDisplayedByCssSelector('button[ng-click="addFieldToSelection()"]').click();
    }

    async addField(field) {
      log.debug('click Add Field icon');
      await this.clickAddField();
      log.debug('select field ' + field);
      await this.selectField(field);
    }

    async query(str) {
      await remote.setFindTimeout(defaultFindTimeout).findByCssSelector('input.kuiLocalSearchInput').type(str);
      await remote.setFindTimeout(defaultFindTimeout).findByCssSelector('button.kuiLocalSearchButton').click();
    }


    async getGraphCircleText() {
      const chartTypes = await remote.setFindTimeout(defaultFindTimeout)
        .findAllByCssSelector('text.nodeSvgText');

      async function getCircleText(circle) {
        return circle.getVisibleText();
      }

      const getChartTypesPromises = chartTypes.map(getCircleText);
      return Promise.all(getChartTypesPromises);
    }

    async getGraphConnectingLines() {
      const chartTypes = await remote.setFindTimeout(defaultFindTimeout)
        .findAllByCssSelector('line.edge');

      async function getLineStyle(line) {
        return line.getAttribute('style');
      }

      const getChartTypesPromises = chartTypes.map(getLineStyle);
      return Promise.all(getChartTypesPromises);
    }

    // click the line which matches the style
    async clickGraphConnectingLine(style) {
      await remote.setFindTimeout(defaultFindTimeout)
        .findByCssSelector('line.edge[style="' + style + '"]').click();
    }

    async newGraph() {
      log.debug('Click New Workspace');
      await remote.setFindTimeout(defaultFindTimeout)
        .findByCssSelector('[aria-label="New Workspace"]').click();
      await PageObjects.common.sleep(1000);
      const modal = await remote.setFindTimeout(defaultFindTimeout).findByCssSelector('#kibana-body');
      const page = await modal.getVisibleText();
      if (page.includes('This will clear the workspace - are you sure?')) {
        return testSubjects.click('confirmModalConfirmButton');
      }
    }

    async saveGraph(name) {
      await remote.setFindTimeout(defaultFindTimeout)
        .findByCssSelector('[aria-label="Save Workspace"]').click();
      await remote.setFindTimeout(defaultFindTimeout)
        .findById('workspaceTitle').type(name);
      await remote.setFindTimeout(defaultFindTimeout)
        .findByCssSelector('button[aria-label="Save workspace"]').click();

      // Confirm that the Graph has been saved.
      return await testSubjects.exists('saveGraphSuccess');
    }

    async openGraph(name) {
      await remote.setFindTimeout(defaultFindTimeout)
        .findByCssSelector('[aria-label="Load Saved Workspace"]').click();
      await remote.setFindTimeout(defaultFindTimeout)
        .findByCssSelector('input[name="filter"]').type(name);
      await PageObjects.common.sleep(1000);
      await remote.setFindTimeout(defaultFindTimeout)
        .findByLinkText(name).click();
      await PageObjects.common.sleep(5000);
    }

    async deleteGraph() {
      await remote.setFindTimeout(defaultFindTimeout)
        .findByCssSelector('[aria-label="Delete Saved Workspace"]').click();
      await testSubjects.click('confirmModalConfirmButton');
    }


    getVennTerm1() {
      return remote.setFindTimeout(defaultFindTimeout)
        .findByCssSelector('span.vennTerm1').getVisibleText();
    }

    getVennTerm2() {
      return remote.setFindTimeout(defaultFindTimeout)
        .findByCssSelector('span.vennTerm2').getVisibleText();
    }

    getSmallVennTerm1() {
      return remote.setFindTimeout(defaultFindTimeout)
        .findByCssSelector('small.vennTerm1').getVisibleText();
    }

    getSmallVennTerm12() {
      return remote.setFindTimeout(defaultFindTimeout)
        .findByCssSelector('small.vennTerm12').getVisibleText();
    }

    getSmallVennTerm2() {
      return remote.setFindTimeout(defaultFindTimeout)
        .findByCssSelector('small.vennTerm2').getVisibleText();
    }

    async getVennEllipse1() {
      const el = await remote.setFindTimeout(defaultFindTimeout).findByCssSelector('ellipse.venn1');
      const cx = await el.getAttribute('cx');
      const cy = await el.getAttribute('cy');
      const rx = await el.getAttribute('rx');
      return { cx: cx, cy: cy, rx: rx };
    }

    async getVennEllipse2() {
      const el = await remote.setFindTimeout(defaultFindTimeout).findByCssSelector('ellipse.venn2');
      const cx = await el.getAttribute('cx');
      const cy = await el.getAttribute('cy');
      const rx = await el.getAttribute('rx');
      return { cx: cx, cy: cy, rx: rx };
    }


  }
  return new GraphPage();
}
