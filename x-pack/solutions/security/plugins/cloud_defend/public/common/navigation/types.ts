/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export interface CloudDefendNavigationItem {
  readonly name: string;
  readonly path: string;
  readonly disabled?: boolean;
}

export interface CloudDefendPageNavigationItem extends CloudDefendNavigationItem {
  id: CloudDefendPageId;
}

export type CloudDefendPage = 'policies';

/**
 * All the IDs for the cloud defend pages.
 * This needs to match the cloud defend page entries in `SecurityPageName` in `x-pack/solutions/security/plugins/security_solution/common/constants.ts`.
 */
export type CloudDefendPageId = 'cloud_defend-policies';
