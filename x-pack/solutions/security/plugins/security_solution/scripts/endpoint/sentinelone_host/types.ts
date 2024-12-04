/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface S1ListResponse<D = any> {
  data: D;
  pagination: {
    nextCursor: null | string;
    totalItems: number;
  };
}

export interface S1Site {
  accountId: string;
  accountName: string;
  activeLicenses: number;
  createdAt: string;
  creator: string;
  creatorId: string;
  description: null | string;
  expiration: null | string;
  externalId: string;
  healthStatus: boolean;
  id: string;
  isDefault: boolean;
  licenses: {
    bundles: Array<{
      displayName: string;
      majorVersion: number;
      minorVersion: number;
      name: string;
      surfaces: Array<{ count: number; name: string }>;
      totalSurfaces: number;
    }>;
    modules: Array<{
      displayName: string;
      majorVersion: number;
      name: string;
    }>;
    settings: Array<{
      displayName: string;
      groupName: string;
      setting: string;
      settingGroup: string;
      settingGroupDisplayName: string;
    }>;
  };
  name: string;
  registrationToken: string;
  siteType: string;
  sku: string;
  state: string;
  suite: string;
  totalLicenses: number;
  unlimitedExpiration: boolean;
  unlimitedLicenses: boolean;
  updatedAt: string;
}

export type S1SitesListApiResponse = S1ListResponse<{
  allSites: {
    activeLicenses: number;
    totalLicenses: number;
  };
  sites: S1Site[];
}>;

export interface S1AgentPackage {
  accounts: string[];
  createdAt: string;
  fileExtension: string;
  fileName: string;
  fileSize: number;
  id: string;
  link: string;
  majorVersion: string;
  minorVersion: string;
  osArch: string;
  osType: string;
  packageType: string;
  platformType: string;
  rangerVersion: null | string;
  sites: string[];
  scopeLevel: string;
  sha1: string;
  status: string;
  updatedAt: string;
  version: string;
}

export type S1AgentPackageListApiResponse = S1ListResponse<S1AgentPackage[]>;
