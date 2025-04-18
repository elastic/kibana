/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface FeaturesPrivileges {
  [featureId: string]: string[];
}
interface ElasticsearchIndices {
  names: string[];
  privileges: string[];
}

export interface Role {
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
