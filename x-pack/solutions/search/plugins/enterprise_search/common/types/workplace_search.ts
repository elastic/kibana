/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Account {
  id: string;
  groups: string[];
  isAdmin: boolean;
  canCreatePrivateSources: boolean;
  viewedOnboardingPage: boolean;
}

export interface Organization {
  defaultOrgName: string;
  kibanaUIsEnabled: boolean;
  name: string;
}

export interface WorkplaceSearchInitialData {
  account: Account;
  organization: Organization;
}

export interface ConfiguredLimits {
  customApiSource: {
    maxDocumentByteSize: number;
    totalFields: number;
  };
}
