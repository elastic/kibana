/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { times, mapValues } from 'lodash';

export function PipelineListProvider({ getService }) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const random = getService('random');

  function assertLengthsMatch(arrays) {
    const lengths = arrays.map(array => array.length);

    try {
      expect(Math.min(...lengths)).to.be(Math.max(...lengths));
    } catch (err) {
      throw new Error(`Expected lengths of arrays to match, ${JSON.stringify(arrays)}`);
    }
  }

  // test subject selectors
  const SUBJ_CONTAINER = `pipelineList`;
  const SUBJ_BTN_ADD = `pipelineList btnAdd`;
  const SUBJ_BTN_DELETE = `pipelineList btnDeletePipeline`;
  const getCloneLinkSubjForId = id => `pipelineList lnkPipelineClone-${id}`;
  const SUBJ_FILTER = `pipelineList filter`;
  const SUBJ_SELECT_ALL = `pipelineList pipelineTable checkboxSelectAll`;
  const getSelectCheckbox = id => `pipelineList pipelineTable checkboxSelectRow-${id}`;
  const SUBJ_CELL_ID = `pipelineList pipelineTable cellId`;
  const SUBJ_CELL_DESCRIPTION = `pipelineList pipelineTable cellDescription`;
  const SUBJ_CELL_LAST_MODIFIED = `pipelineList pipelineTable cellLastModified`;
  const SUBJ_CELL_USERNAME = `pipelineList pipelineTable cellUsername`;
  const SUBJ_BTN_NEXT_PAGE = `pipelineList pagination-button-next`;

  return new class PipelineList {
    /**
     *  Set the text of the pipeline list filter
     *  @param  {string} value
     *  @return {Promise<undefined>}
     */
    async setFilter(value) {
      await testSubjects.setValue(SUBJ_FILTER, value);
    }

    /**
     *  Get the total row count as well as the count of rows that
     *  are selected/unselected
     *  @return {Promise<Object>}
     */
    async getRowCounts() {
      const ids = await this.getRowIds();
      const isSelecteds = await Promise.all(
        ids.map(async (id) => await testSubjects.isSelected(getSelectCheckbox(id)))
      );
      const total = isSelecteds.length;
      const isSelected = isSelecteds.filter(Boolean).length;
      const isUnselected = total - isSelected;
      return { total, isSelected, isUnselected };
    }

    /**
     *  Read the rows from the table, mapping the cell values to key names
     *  in an array of objects
     *  @return {Promise<Array<Object>>}
     */
    async getRowsFromTable() {
      const ids = await this.getRowIds();
      const selected = await Promise.all(ids.map(async (id) => await testSubjects.isSelected(getSelectCheckbox(id))));
      const description = await testSubjects.getVisibleTextAll(SUBJ_CELL_DESCRIPTION);
      const lastModified = await testSubjects.getVisibleTextAll(SUBJ_CELL_LAST_MODIFIED);
      const username = await testSubjects.getVisibleTextAll(SUBJ_CELL_USERNAME);
      const valuesByKey = { selected, id: ids, description, lastModified, username };

      // ensure that we got values for every row, otherwise we can't
      // recombine these into a list of rows
      assertLengthsMatch(Object.values(valuesByKey));

      return times(valuesByKey.id.length, i => {
        return mapValues(valuesByKey, values => values[i]);
      });
    }

    /**
     *  Click the selectAll checkbox until all rows are selected
     *  @return {Promise<undefined>}
     */
    async selectAllRows() {
      await retry.try(async () => {
        const { isUnselected } = await this.getRowCounts();
        if (isUnselected > 0) {
          await this.clickSelectAll();
          throw new Error(`${isUnselected} rows need to be selected`);
        }
      });
    }

    /**
     *  Click the selectAll checkbox until all rows are unselected
     *  @return {Promise<undefined>}
     */
    async deselectAllRows() {
      await retry.try(async () => {
        const { isSelected } = await this.getRowCounts();
        if (isSelected > 0) {
          await this.clickSelectAll();
          throw new Error(`${isSelected} rows need to be deselected`);
        }
      });
    }

    /**
     *  Select a random row from the list and waits for the selection to
     *  be represented in the row counts
     *  @return {Promise<undefined>}
     */
    async selectRandomRow() {
      const initial = await this.getRowCounts();

      if (!initial.total) {
        throw new Error('pipelineList.selectRandomRow() requires there to be at least one row');
      }

      if (!initial.isUnselected) {
        throw new Error('pipelineList.selectRandomRow() requires at least one unselected row');
      }

      // get pick an unselected selectbox and click it
      await retry.try(async () => {
        const ids = await this.getRowIds();
        const rowToClick = await random.pickOne(ids);
        const checkboxId = getSelectCheckbox(rowToClick);
        const isSelected = await testSubjects.isSelected(checkboxId);

        if (isSelected) {
          throw new Error('randomly chosen row was already selected');
        }

        await testSubjects.click(checkboxId);
      });

      // wait for the selected count to grow
      await retry.try(async () => {
        const now = await this.getRowCounts();
        if (initial.isSelected >= now.isSelected) {
          throw new Error(`randomly selected row still not selected`);
        }
      });
    }

    /**
     * Get a list of all pipeline IDs in the current table
     * @return {Promise<any>}
     */
    async getRowIds() {
      return await testSubjects.getVisibleTextAll(SUBJ_CELL_ID);
    }

    /**
     *  Click the add button, does not wait for navigation to complete
     *  @return {Promise<undefined>}
     */
    async clickAdd() {
      await testSubjects.click(SUBJ_BTN_ADD);
    }

    /**
     *  Click the selectAll checkbox
     *  @return {Promise<undefined>}
     */
    async clickSelectAll() {
      await testSubjects.click(SUBJ_SELECT_ALL);
    }

    /**
     *  Click the id of the first row
     *  @return {Promise<undefined>}
     */
    async clickFirstRowId() {
      await testSubjects.click(SUBJ_CELL_ID);
    }

    /**
     *  Click the clone link for the given pipeline id
     *  @return {Promise<undefined>}
     */
    async clickCloneLink(id) {
      await testSubjects.click(getCloneLinkSubjForId(id));
    }

    /**
     *  Assert that the pipeline list is visible on screen
     *  @return {Promise<undefined>}
     */
    async assertExists() {
      await retry.try(async () => {
        if (!(await testSubjects.exists(SUBJ_CONTAINER))) {
          throw new Error('Expected to find the pipeline list');
        }
      });
    }

    /**
     *  Check if the delete button is enabled or disabled and
     *  throw the appropriate error if it is not
     *  @param  {boolean} expected
     *  @return {Promise}
     */
    async assertDeleteButton({ enabled }) {
      if (typeof enabled !== 'boolean') {
        throw new Error('you must specify the expected enabled state of the delete button');
      }

      const actual = await testSubjects.isEnabled(SUBJ_BTN_DELETE);
      if (enabled !== actual) {
        throw new Error(`Expected delete button to be ${enabled ? 'enabled' : 'disabled'}`);
      }
    }

    /**
     * Check if the delete button has been rendered on the page
     * and throw an error if it has
     */
    async assertDeleteButtonMissing() {
      try {
        await testSubjects.missingOrFail(SUBJ_BTN_DELETE);
      } catch (e) {
        throw e;
      }
    }

    /**
     * Click the next page button
     */
    async clickNextPage() {
      await testSubjects.click(SUBJ_BTN_NEXT_PAGE);
    }

    /**
     *  Check if the next page button is enabled or disabled and
     *  throw the appropriate error if it is not
     *  @param  {boolean} expected
     *  @return {Promise}
     */
    async assertNextPageButton({ enabled }) {
      if (typeof enabled !== 'boolean') {
        throw new Error('you must specify the expected enabled state of the next page button');
      }

      const actual = await testSubjects.isEnabled(SUBJ_BTN_NEXT_PAGE);
      if (enabled !== actual) {
        throw new Error(`Expected next page button to be ${enabled ? 'enabled' : 'disabled'}`);
      }
    }
  }();
}
