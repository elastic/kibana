/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceEcs } from '@kbn/securitysolution-ecs';
import type { CommonFields, Maybe } from '../../..';

export interface ServiceItem {
  service?: Maybe<ServiceEcs>;
}

export interface ServiceAggEsItem {
  service_id?: ServiceBuckets;
  service_name?: ServiceBuckets;
  service_address?: ServiceBuckets;
  service_environment?: ServiceBuckets;
  service_ephemeral_id?: ServiceBuckets;
  service_node_name?: ServiceBuckets;
  service_node_role?: ServiceBuckets;
  service_node_roles?: ServiceBuckets;
  service_state?: ServiceBuckets;
  service_type?: ServiceBuckets;
  service_version?: ServiceBuckets;
}

export interface ServiceBuckets {
  buckets: Array<{
    key: string;
    doc_count: number;
  }>;
}

export interface AllServicesAggEsItem {
  key: string;
  domain?: ServicesDomainHitsItem;
  lastSeen?: { value_as_string: string };
}

type ServiceFields = CommonFields &
  Partial<{
    [Property in keyof ServiceEcs as `service.${Property}`]: unknown[];
  }>;

interface ServicesDomainHitsItem {
  hits: {
    hits: Array<{
      fields: ServiceFields;
    }>;
  };
}
