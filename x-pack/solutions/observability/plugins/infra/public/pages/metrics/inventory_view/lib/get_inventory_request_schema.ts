/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { DEFAULT_SCHEMA } from '../../../../../common/constants';

/**
 * Resolves the Schema Inventory waffle / timeline / tooltip requests should send.
 *
 * Follows `preferredSchema`, falling through to `DEFAULT_SCHEMA` when unset.
 * The Schema control itself stays gated per node type in the toolbar.
 */
export const getInventoryRequestSchema = (
  preferredSchema: DataSchemaFormat | null | undefined
): DataSchemaFormat => {
  return preferredSchema ?? DEFAULT_SCHEMA;
};
