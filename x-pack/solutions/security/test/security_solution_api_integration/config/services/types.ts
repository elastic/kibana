/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type TestAgent from 'supertest/lib/agent';

import type { SearchService } from '@kbn/ftr-common-functional-services';

export interface SecuritySolutionUtilsInterface {
  getUsername: (role?: string) => Promise<string>;
  createSuperTest: (role?: string, password?: string) => Promise<TestAgent<any>>;
  cleanUpCustomRoles: () => Promise<void>;
  createSuperTestWithCustomRole: (role: CustomRole) => Promise<TestAgent<any>>;
  createSearch: (role?: string) => Promise<SearchService>;
}

interface FeaturesPrivileges {
  [featureId: string]: string[];
}

interface ElasticsearchIndices {
  names: string[];
  privileges: string[];
}

export interface CustomRole {
  name: string;
  privileges: {
    elasticsearch: ElasticSearchPrivilege;
    kibana: KibanaPrivilege[];
  };
}
export interface ElasticSearchPrivilege {
  cluster?: string[];
  indices?: ElasticsearchIndices[];
}

export interface KibanaPrivilege {
  spaces: string[];
  base?: string[];
  feature?: FeaturesPrivileges;
}

export interface User {
  username: string;
  password: string;
  description?: string;
  roles: string[];
}
