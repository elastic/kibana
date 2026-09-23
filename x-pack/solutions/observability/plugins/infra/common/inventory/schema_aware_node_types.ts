/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { SupportedEntityTypesRT, type EntityTypes } from '../http_api/shared/entity_type';

/** Node types that participate in Inventory Schema detection and selection. */
export const isSchemaAwareNodeType = (nodeType: InventoryItemType): nodeType is EntityTypes =>
  SupportedEntityTypesRT.is(nodeType);
