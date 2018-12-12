/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function GraphPageProvider({ getService, getPageObjects }) {
  const find = getService('find');
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'header', 'settings']);
  const retry = getService('retry');


  class GraphPage {

    async selectIndexPattern(pattern) {
      await find.clickDisplayedByCssSelector('.gphIndexSelect');
      await find.clickByCssSelector('.gphIndexSelect > option[label="' + pattern + '"]');
    }

    async clickAddField() {
      await retry.try(async () => {
        await find.clickByCssSelector('#addVertexFieldButton');
        // make sure the fieldSelectionList is not hidden
        await testSubjects.exists('fieldSelectionList');
      });
    }

    async selectField(field) {
      await find.clickDisplayedByCssSelector('select[id="fieldList"] > option[label="' + field + '"]');
      await find.clickDisplayedByCssSelector('button[ng-click="addFieldToSelection()"]');
    }

    async addField(field) {
      log.debug('click Add Field icon');
      await this.clickAddField();
      log.debug('select field ' + field);
      await this.selectField(field);
    }

    async query(str) {
      await find.setValue('input.kuiLocalSearchInput', str);
      await find.clickDisplayedByCssSelector('button.kuiLocalSearchButton');
    }


    async getGraphCircleText() {
      const chartTypes = await find.allByCssSelector('text.gphNode__label');

      async function getCircleText(circle) {
        return circle.getVisibleText();
      }

      const getChartTypesPromises = chartTypes.map(getCircleText);
      return Promise.all(getChartTypesPromises);
    }

    async getGraphConnectingLines() {
      const chartTypes = await find.allByCssSelector('line.edge');

      async function getLineStyle(line) {
        return line.getAttribute('style');
      }

      const getChartTypesPromises = chartTypes.map(getLineStyle);
      return Promise.all(getChartTypesPromises);
    }

    // click the line which matches the style
    async clickGraphConnectingLine(style) {
      await find.clickByCssSelector('line.edge[style="' + style + '"]');
    }

    async newGraph() {
      log.debug('Click New Workspace');
      await find.clickByCssSelector('[aria-label="New Workspace"]');
      await PageObjects.common.sleep(1000);
      const modal = await find.byCssSelector('#kibana-body');
      const page = await modal.getVisibleText();
      if (page.includes('This will clear the workspace - are you sure?')) {
        return testSubjects.click('confirmModalConfirmButton');
      }
    }

    async saveGraph(name) {
      await find.clickByCssSelector('[aria-label="Save Workspace"]');
      await find.setValue('#workspaceTitle', name);
      await find.clickByCssSelector('button[aria-label="Save workspace"]');

      // Confirm that the Graph has been saved.
      return await testSubjects.exists('saveGraphSuccess');
    }

    async openGraph(name) {
      await find.clickByCssSelector('[aria-label="Load Saved Workspace"]');
      await find.setValue('input[name="filter"]', name);
      await PageObjects.common.sleep(1000);
      await find.clickByLinkText(name);
      await PageObjects.common.sleep(5000);
    }

    async deleteGraph() {
      await find.clickByCssSelector('[aria-label="Delete Saved Workspace"]');
      await testSubjects.click('confirmModalConfirmButton');
    }


    async getVennTerm1() {
      const el = await find.byCssSelector('span.vennTerm1');
      return await el.getVisibleText();
    }

    async getVennTerm2() {
      const el = await find.byCssSelector('span.vennTerm2');
      return await el.getVisibleText();
    }

    async getSmallVennTerm1() {
      const el = await find.byCssSelector('small.vennTerm1');
      return await el.getVisibleText();
    }

    async getSmallVennTerm12() {
      const el = await find.byCssSelector('small.vennTerm12');
      return await el.getVisibleText();
    }

    async getSmallVennTerm2() {
      const el = await find.byCssSelector('small.vennTerm2');
      return await el.getVisibleText();
    }

    async getVennEllipse1() {
      const el = await find.byCssSelector('ellipse.venn1');
      const cx = await el.getAttribute('cx');
      const cy = await el.getAttribute('cy');
      const rx = await el.getAttribute('rx');
      return { cx: cx, cy: cy, rx: rx };
    }

    async getVennEllipse2() {
      const el = await find.byCssSelector('ellipse.venn2');
      const cx = await el.getAttribute('cx');
      const cy = await el.getAttribute('cy');
      const rx = await el.getAttribute('rx');
      return { cx: cx, cy: cy, rx: rx };
    }


  }
  return new GraphPage();
}
