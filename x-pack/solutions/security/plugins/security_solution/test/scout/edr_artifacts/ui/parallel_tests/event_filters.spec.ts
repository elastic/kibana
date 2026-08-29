/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeArtifactTabPolicyDetails } from '../fixtures/artifact_tabs_suite';
import { getArtifactTabCase } from '../fixtures/artifact_tabs_test_data';

describeArtifactTabPolicyDetails(getArtifactTabCase('eventFilters'));
