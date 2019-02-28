/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function readPipelineListRows(container, cssSelectors) {
  return Array.prototype.map.call(
    container.querySelectorAll(cssSelectors.ROW),
    function (row) {
      return {
        selected: row.querySelector('input[type=checkbox]').checked,
        id: row.querySelector(cssSelectors.CELL_ID).innerText.trim(),
        description: row.querySelector(cssSelectors.CELL_DESCRIPTION).innerText.trim(),
        lastModified: row.querySelector(cssSelectors.CELL_LAST_MODIFIED).innerText.trim(),
        username: row.querySelector(cssSelectors.CELL_USERNAME).innerText.trim(),
      };
    }
  );
}
