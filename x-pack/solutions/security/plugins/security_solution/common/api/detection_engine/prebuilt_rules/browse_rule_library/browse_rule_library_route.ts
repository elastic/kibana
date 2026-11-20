/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema, savedObjectId } from '@kbn/zod/v4';
import type { Severity } from '../../model/rule_schema';
import { PrebuiltRuleAssetsSort } from '../review_rule_installation/review_rule_installation_route.gen';

const MAX_PAGE_SIZE = 100;
const MAX_PAGE = 10_000;
const MAX_SEARCH_LENGTH = 256;
const MAX_TACTICS = 20;
const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 256;
// MITRE ATT&CK tactic ids, such as TA0002, and the ids of other frameworks, such as AML.TA0004.
const TACTIC_ID_PATTERN = /^[A-Za-z0-9._-]{1,32}$/;

export type BrowseRuleLibraryRequestBody = z.infer<typeof BrowseRuleLibraryRequestBody>;
export const BrowseRuleLibraryRequestBody = lazySchema(() =>
  z
    .object({
      // Omit to browse every library.
      library_id: savedObjectId().optional(),
      // Matches the rule name or one of its tags.
      search: z.string().max(MAX_SEARCH_LENGTH).optional(),
      // Only the rules that have all of these tags.
      tags: z.array(z.string().min(1).max(MAX_TAG_LENGTH)).max(MAX_TAGS).optional(),
      // Only the rules that have one of these tactics.
      tactics: z.array(z.string().regex(TACTIC_ID_PATTERN)).max(MAX_TACTICS).optional(),
      page: z.number().int().min(1).max(MAX_PAGE).default(1),
      per_page: z.number().int().min(1).max(MAX_PAGE_SIZE).default(10),
      sort: PrebuiltRuleAssetsSort.optional(),
    })
    .strict()
);

export type RuleLibraryRuleInstallState =
  | 'installable'
  | 'installed'
  | 'installed_from_other_library';

export interface RuleLibraryRuleRelatedIntegration {
  package: string;
  integration?: string;
  version?: string;
}

export interface RuleLibraryRule {
  rule_id: string;
  version: number;
  library_id: string;
  name: string;
  description: string;
  severity: Severity;
  risk_score: number;
  tags: string[];
  related_integrations: RuleLibraryRuleRelatedIntegration[];
  install_state: RuleLibraryRuleInstallState;
  // Set when install_state is installed_from_other_library.
  installed_from_library?: { id: string; title: string };
}

export interface BrowseRuleLibraryResponseBody {
  rules: RuleLibraryRule[];
  total: number;
  page: number;
  per_page: number;
}
