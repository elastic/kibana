/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeArtifactListPage } from '../fixtures/artifact_list_suite';
import { describeArtifactTabPolicyDetails } from '../fixtures/artifact_tabs_suite';
import { getArtifactTabCase } from '../fixtures/artifact_tabs_test_data';

const eventFilters = getArtifactTabCase('eventFilters');

// This is the only spec file that writes the agnostic `endpoint_event_filters`
// list, so it owns the shared-list suites: they wipe the list and assert on
// the empty states, which the item-scoped suites cannot.
describeArtifactTabPolicyDetails(eventFilters);
describeArtifactListPage(eventFilters, { writeWithoutGlobalArtifactManagement: true });
