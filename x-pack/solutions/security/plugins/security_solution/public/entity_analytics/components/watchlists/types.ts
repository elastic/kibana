/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface WatchlistGroupLabel {
  id: string;
  label: string;
  isGroupLabelOption: true;
  groupicon: string;
  prepend?: React.ReactNode;
  checked?: never;
}

export interface WatchlistItem {
  id: string;
  label: string;
  isGroupLabelOption?: false;
  checked?: 'on' | 'off';
  groupicon?: never;
  prepend?: React.ReactNode;
}

export type WatchlistOption = WatchlistGroupLabel | WatchlistItem;
