/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeArtifactListPage } from '../fixtures/artifact_list_suite';
import { describeArtifactTabPolicyDetails } from '../fixtures/artifact_tabs_suite';
import { describeBlocklistOperatorField } from '../fixtures/blocklist_operator_suite';
import { getArtifactTabCase } from '../fixtures/artifact_tabs_test_data';

const blocklists = getArtifactTabCase('blocklists');

// Suites share this file on purpose: they all mutate the same agnostic
// `endpoint_blocklists` list, which spaces do not isolate.
describeArtifactTabPolicyDetails(blocklists);
describeArtifactListPage(blocklists);
describeBlocklistOperatorField(blocklists);
