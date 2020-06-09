/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function PipelineListProvider({ getService }) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const random = getService('random');

  // test subject selectors
  const SUBJ_CONTAINER = `pipelineList`;
  const SUBJ_BTN_ADD = `pipelineList > btnAdd`;
  const SUBJ_BTN_DELETE = `pipelineList > btnDeletePipeline`;
  const getCloneLinkSubjForId = (id) => `pipelineList > lnkPipelineClone-${id}`;
  const SUBJ_FILTER = `pipelineList > filter`;
  const SUBJ_SELECT_ALL = `pipelineList > pipelineTable > checkboxSelectAll`;
  const getSelectCheckbox = (id) => `pipelineList > pipelineTable > checkboxSelectRow-${id}`;
  const SUBJ_BTN_NEXT_PAGE = `pipelineList > pagination-button-next`;

  const INNER_SUBJ_ROW = `row`;
  const INNER_SUBJ_CELL_ID = `cellId`;
  const INNER_SUBJ_CELL_DESCRIPTION = `cellDescription`;
  const INNER_SUBJ_CELL_LAST_MODIFIED = `cellLastModified`;
  const INNER_SUBJ_CELL_USERNAME = `cellUsername`;

  const SUBJ_CELL_ID = `${SUBJ_CONTAINER} > ${INNER_SUBJ_ROW} > ${INNER_SUBJ_CELL_ID}`;

  return new (class PipelineList {
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
      const rows = await this.readRows();
      const total = rows.length;
      const isSelected = rows.reduce((acc, row) => acc + (row.selected ? 1 : 0), 0);
      const isUnselected = total - isSelected;
      return { total, isSelected, isUnselected };
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

      // pick an unselected selectbox and select it
      const rows = await this.readRows();
      const rowToClick = await random.pickOne(rows.filter((r) => !r.selected));
      await testSubjects.click(getSelectCheckbox(rowToClick.id));

      await retry.waitFor(
        'selected count to grow',
        async () => (await this.getRowCounts()).isSelected > initial.isSelected
      );
    }

    /**
     *  Read the rows from the table, mapping the cell values to key names
     *  in an array of objects
     *  @return {Promise<Array<Object>>}
     */
    async readRows() {
      const pipelineTable = await testSubjects.find('pipelineTable');
      const $ = await pipelineTable.parseDomContent();
      return $.findTestSubjects(INNER_SUBJ_ROW)
        .toArray()
        .map((row) => {
          return {
            selected: $(row).hasClass('euiTableRow-isSelected'),
            id: $(row).findTestSubjects(INNER_SUBJ_CELL_ID).text(),
            description: $(row).findTestSubjects(INNER_SUBJ_CELL_DESCRIPTION).text(),
            lastModified: $(row).findTestSubjects(INNER_SUBJ_CELL_LAST_MODIFIED).text(),
            username: $(row).findTestSubjects(INNER_SUBJ_CELL_USERNAME).text(),
          };
        });
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
      await retry.waitFor('pipline list visible on screen', async () => {
        const container = await testSubjects.find(SUBJ_CONTAINER);
        const found = await container.findAllByCssSelector('table tbody');
        const isLoading = await testSubjects.exists('loadingPipelines');
        return found.length > 0 && isLoading === false;
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
  })();
}
