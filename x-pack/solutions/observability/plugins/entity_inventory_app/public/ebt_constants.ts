/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** EBT click `element` values: where in the entity inventory the click happened. */
export const ENTITY_INVENTORY_EBT_ELEMENTS = {
  NO_DATA: 'entityInventoryNoData',
  ENTITY_TABLE: 'entityInventoryEntityTable',
};

/** EBT click `action` values specific to the entity inventory. */
export const ENTITY_INVENTORY_EBT_ACTIONS = {
  /** User retries loading the entities after a failed request. */
  RETRY_LOAD: 'retryLoad',
  /** User restores the table's default columns and sort. */
  RESET_TABLE: 'resetTable',
};
