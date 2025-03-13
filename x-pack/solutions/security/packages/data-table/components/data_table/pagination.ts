/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * rowIndex is bigger than `data.length` for pages with page numbers bigger than one.
 * For that reason, we must calculate `rowIndex % itemsPerPage`.
 *
 * Ex:
 * Given `rowIndex` is `13` and `itemsPerPage` is `10`.
 * It means that the `activePage` is `2` and the `pageRowIndex` is `3`
 *
 * **Warning**:
 * Be careful with array out of bounds. `pageRowIndex` can be bigger or equal to `data.length`
 *  in the scenario where the user changes the event status (Open, Acknowledged, Closed).
 */

export const getPageRowIndex = (rowIndex: number, itemsPerPage: number) => rowIndex % itemsPerPage;
