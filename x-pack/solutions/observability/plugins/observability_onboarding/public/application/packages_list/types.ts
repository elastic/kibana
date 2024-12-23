/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IntegrationCardItem } from '@kbn/fleet-plugin/public';

export type VirtualCard = {
  type: 'virtual';
} & IntegrationCardItem;

export interface FeaturedCard {
  type: 'featured';
  name: string;
}

export type CustomCard = FeaturedCard | VirtualCard;
