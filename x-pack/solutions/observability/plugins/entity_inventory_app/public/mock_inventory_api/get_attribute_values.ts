/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityInventoryAttributeValuesParams } from '../inventory_api_types';

const MOCK_ATTRIBUTE_VALUES: Record<string, string[]> = {
  'os.type': ['darwin', 'linux', 'windows'],
  'host.arch': ['amd64', 'arm64'],
  'cloud.provider': ['aws', 'azure', 'gcp'],
  'cloud.region': ['eu-west-1', 'us-central1', 'us-east-1'],
  'k8s.cluster.name': ['prod-eu', 'prod-us', 'staging'],
  'k8s.namespace.name': ['checkout', 'default', 'payments'],
  'k8s.pod.phase': ['failed', 'pending', 'running'],
};

export const getEntityInventoryAttributeValues = async ({
  attribute,
}: EntityInventoryAttributeValuesParams): Promise<string[]> =>
  MOCK_ATTRIBUTE_VALUES[attribute] ?? [];
