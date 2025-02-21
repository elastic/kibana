/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CardSelectorListItem } from './common/card_selector_list';

export enum CardAssetType {
  video = 'video',
  image = 'image',
}
export interface CardAsset {
  type: CardAssetType;
  source: string;
  alt: string;
}
export interface CardSelectorAssetListItem extends CardSelectorListItem {
  asset: CardAsset;
}
