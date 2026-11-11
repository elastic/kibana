/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeBlocklistMatchOperator } from '../fixtures/blocklist_match_operator_suite';
import { getArtifactTabCase } from '../fixtures/artifact_tabs_test_data';

// Shares the agnostic `endpoint_blocklists` list with `blocklists.spec.ts` and
// `blocklist_signature_operator.spec.ts`; see the note there.
describeBlocklistMatchOperator(getArtifactTabCase('blocklists'));
