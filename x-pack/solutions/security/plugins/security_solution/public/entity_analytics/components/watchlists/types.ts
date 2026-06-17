/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export interface BaseWatchlistOption {
  id: string;
  label: string;
  prepend?: React.ReactNode;
}

export interface WatchlistGroupLabel extends BaseWatchlistOption {
  isGroupLabelOption: true;
  checked?: never;
}

export interface WatchlistItem extends BaseWatchlistOption {
  isGroupLabelOption?: false;
  checked?: 'on' | 'off';
  groupIcon?: never;
  prepend?: React.ReactNode;
}

export type WatchlistOption = WatchlistGroupLabel | WatchlistItem;
