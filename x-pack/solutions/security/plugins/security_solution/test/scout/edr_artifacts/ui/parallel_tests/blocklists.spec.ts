/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeArtifactListPageItemScoped } from '../fixtures/artifact_list_item_scoped_suite';
import { describeArtifactTabPolicyDetailsItemScoped } from '../fixtures/artifact_tabs_item_scoped_suite';
import { getArtifactTabCase } from '../fixtures/artifact_tabs_test_data';

const blocklists = getArtifactTabCase('blocklists');

// The agnostic `endpoint_blocklists` list is also written by
// `blocklist_signature_operator.spec.ts` and `blocklist_match_operator.spec.ts`,
// which may run on another worker at the same time. These suites never wipe
// the list; they create uniquely named items and delete only those.
describeArtifactTabPolicyDetailsItemScoped(blocklists);
describeArtifactListPageItemScoped(blocklists);
