/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import {
  ENDPOINT_ARTIFACT_LISTS,
  EXCEPTION_LIST_ITEM_URL,
  INTERNAL_EXCEPTIONS_LIST_ENSURE_CREATED_URL,
} from '@kbn/securitysolution-list-constants';
import { ExceptionsListItemGenerator } from '@kbn/security-solution-plugin/common/endpoint/data_generators/exceptions_list_item_generator';
import {
  DISABLED_ARTIFACT_TAG,
  GLOBAL_ARTIFACT_TAG,
} from '@kbn/security-solution-plugin/common/endpoint/service/artifacts/constants';

interface CustomYaraSignatureScenario {
  itemId: string;
  name: string;
  tags: readonly string[];
}

export const CUSTOM_YARA_SIGNATURE_SCENARIOS = {
  noPolicy: {
    itemId: 'eval-ts-yara-no-policy',
    name: 'EVAL_TS_yara_no_policy',
    tags: [],
  },
  disabled: {
    itemId: 'eval-ts-yara-disabled',
    name: 'EVAL_TS_yara_disabled',
    tags: [GLOBAL_ARTIFACT_TAG, DISABLED_ARTIFACT_TAG],
  },
} as const satisfies Record<string, CustomYaraSignatureScenario>;

const CUSTOM_YARA_SIGNATURES_LIST_DEFINITION = {
  list_id: ENDPOINT_ARTIFACT_LISTS.customYaraSignatures.id,
  name: ENDPOINT_ARTIFACT_LISTS.customYaraSignatures.name,
  description: ENDPOINT_ARTIFACT_LISTS.customYaraSignatures.description,
  namespace_type: 'agnostic',
  type: 'endpoint_custom_yara_signatures',
} as const;

/** Creates the custom YARA signature list (if missing) and the eval signatures. */
export async function seedCustomYaraSignatures(kbnClient: KbnClient): Promise<void> {
  await kbnClient.request({
    method: 'POST',
    path: INTERNAL_EXCEPTIONS_LIST_ENSURE_CREATED_URL,
    body: CUSTOM_YARA_SIGNATURES_LIST_DEFINITION,
    headers: { 'elastic-api-version': '1' },
  });

  const generator = new ExceptionsListItemGenerator('eval-ts-yara');

  for (const { itemId, name, tags } of Object.values(CUSTOM_YARA_SIGNATURE_SCENARIOS)) {
    await kbnClient.request({
      method: 'POST',
      path: EXCEPTION_LIST_ITEM_URL,
      body: generator.generateCustomYaraSignatureForCreate({
        item_id: itemId,
        name,
        description: 'Automatic troubleshooting eval signature',
        os_types: ['linux'],
        tags: [...tags],
      }),
      headers: { 'elastic-api-version': '2023-10-31' },
    });
  }
}

/** Deletes the eval signatures; missing signatures are ignored. */
export async function cleanupCustomYaraSignatures(kbnClient: KbnClient): Promise<void> {
  for (const { itemId } of Object.values(CUSTOM_YARA_SIGNATURE_SCENARIOS)) {
    await kbnClient.request({
      method: 'DELETE',
      path: EXCEPTION_LIST_ITEM_URL,
      query: { item_id: itemId, namespace_type: 'agnostic' },
      headers: { 'elastic-api-version': '2023-10-31' },
      ignoreErrors: [404],
    });
  }
}
