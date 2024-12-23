/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LocatorPublic } from '@kbn/share-plugin/common/url_service/locators';
import { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { SerializableRecord } from '@kbn/utility-types';
import { InfraWaffleMapNode } from '../../../../common/inventory/types';

export const navigateToUptime = ({
  uptimeLocator,
  nodeType,
  node,
}: {
  uptimeLocator: LocatorPublic<SerializableRecord>;
  nodeType: InventoryItemType;
  node: InfraWaffleMapNode;
}) => {
  return uptimeLocator.navigate({ [nodeType]: node.id, ip: node.ip });
};
