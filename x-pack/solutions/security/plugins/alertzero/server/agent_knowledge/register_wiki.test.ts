/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import {
  getManagedWorkflowDefinition,
  ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import {
  ALERTZERO_WIKI_ID,
  ALERTZERO_WIKI_INDEX,
  DETECTION_RULE_ENTRIES_HEADING,
  DETECTION_RULE_PAGE_TYPE,
} from '../../common/rule_tuning_wiki';
import { registerAlertZeroWiki } from './register_wiki';

describe('registerAlertZeroWiki', () => {
  it('registers the detection rule page type on the index the Worker roles can write', () => {
    const registerWiki = jest.fn();

    registerAlertZeroWiki({ registerWiki });

    expect(registerWiki).toHaveBeenCalledWith({
      id: ALERTZERO_WIKI_ID,
      index: 'ai-index-idx-security-investigations',
      pageTypes: { detection_rule: { entriesHeading: DETECTION_RULE_ENTRIES_HEADING } },
    });
    expect(ALERTZERO_WIKI_INDEX).toBe('ai-index-idx-security-investigations');
  });

  it('matches the wiki and page type the Rule Tuning review names', () => {
    const review = getManagedWorkflowDefinition(ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID);
    const { consts } = parse(review?.yaml ?? '') as { consts: Record<string, unknown> };

    expect(consts.wiki_id).toBe(ALERTZERO_WIKI_ID);
    expect(consts.rule_page_type).toBe(DETECTION_RULE_PAGE_TYPE);
  });
});
