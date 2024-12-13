/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import type { Group } from '../../typings';

export interface Query {
  query: string;
  language: string;
}
export interface Field {
  name: string;
  value: string;
}
interface Props {
  tags?: string[];
  groups?: Group[];
  ruleId?: string;
  sharedFields?: Field[];
}

// APM rules
export const SERVICE_NAME = 'service.name';
// Synthetics rules
export const MONITOR_ID = 'monitor.id';
// - location
export const OBSERVER_NAME = 'observer.name';
// Inventory rule
export const HOST = 'host.name';
export const KUBERNETES_POD = 'kubernetes.pod.uid';
export const DOCKER_CONTAINER = 'container.id';
export const EC2_INSTANCE = 'cloud.instance.id';
export const S3_BUCKETS = 'aws.s3.bucket.name';
export const RDS_DATABASES = 'aws.rds.db_instance.arn';
export const SQS_QUEUES = 'aws.sqs.queue.name';

const ALL_SHARED_FIELDS = [
  SERVICE_NAME,
  MONITOR_ID,
  OBSERVER_NAME,
  HOST,
  KUBERNETES_POD,
  DOCKER_CONTAINER,
  EC2_INSTANCE,
  S3_BUCKETS,
  RDS_DATABASES,
  SQS_QUEUES,
];

interface AlertFields {
  [key: string]: any;
}

export const getSharedFields = (alertFields: AlertFields = {}) => {
  const matchedFields: Field[] = [];
  ALL_SHARED_FIELDS.forEach((source) => {
    Object.keys(alertFields).forEach((field) => {
      if (source === field) {
        const fieldValue = alertFields[field];
        matchedFields.push({
          name: source,
          value: Array.isArray(fieldValue) ? fieldValue[0] : fieldValue,
        });
      }
    });
  });

  return matchedFields;
};

const EXCLUDE_TAGS = ['apm'];

export const getRelatedAlertKuery = ({ tags, groups, ruleId, sharedFields }: Props = {}):
  | string
  | undefined => {
  const tagKueries =
    tags
      ?.filter((tag) => !EXCLUDE_TAGS.includes(tag))
      .map((tag) => {
        return `tags: "${tag}"`;
      }) ?? [];
  const groupKueries =
    (groups &&
      groups.map(({ field, value }) => {
        return `(${field}: "${value}" or kibana.alert.group.value: "${value}")`;
      })) ??
    [];
  const ruleKueries = (ruleId && [`(${ALERT_RULE_UUID}: "${ruleId}")`]) ?? [];
  const groupFields = groups?.map((group) => group.field) ?? [];
  const sharedFieldsKueries =
    sharedFields
      ?.filter((field) => !groupFields.includes(field.name))
      .map((field) => {
        return `(${field.name}: "${field.value}")`;
      }) ?? [];

  const tagKueriesStr = tagKueries.length > 0 ? [`(${tagKueries.join(' or ')})`] : [];
  const groupKueriesStr = groupKueries.length > 0 ? [`${groupKueries.join(' or ')}`] : [];
  const kueries = [...tagKueriesStr, ...groupKueriesStr, ...sharedFieldsKueries, ...ruleKueries];

  return kueries.length ? kueries.join(' or ') : undefined;
};
