/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SearchHomepagePluginSetup {}

export interface SearchHomepagePluginStart {}

export interface RouterContextData {
  isServerless: boolean;
}

export interface StatsResponse {
  sizeStats: {
    size: string;
    documents: number;
  };
}
