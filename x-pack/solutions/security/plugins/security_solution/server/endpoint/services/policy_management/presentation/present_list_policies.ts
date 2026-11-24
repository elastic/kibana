/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ListPoliciesResult,
  ListedPolicyItem,
} from '../services/endpoint_policy_management_service';
import { omitTrailingToFit, toPresentationHash } from './trim_policy_result';

export const LIST_POLICIES_MAX_RESULT_TOKENS = 8_000;

type PresentedListPolicies = ListPoliciesResult & {
  items_total?: number;
  items_truncated?: true;
};

const presentListPolicyItem = (item: ListedPolicyItem): ListedPolicyItem => ({
  ...item,
  normalizedHash: toPresentationHash(item.normalizedHash),
});

export const presentListPolicies = (dto: ListPoliciesResult): PresentedListPolicies => {
  const presentedItems = dto.items.map(presentListPolicyItem);

  return omitTrailingToFit(
    (keep): PresentedListPolicies => ({
      ...dto,
      items: presentedItems.slice(0, keep),
      ...(keep < presentedItems.length
        ? { items_total: presentedItems.length, items_truncated: true as const }
        : {}),
    }),
    presentedItems.length,
    LIST_POLICIES_MAX_RESULT_TOKENS
  );
};
