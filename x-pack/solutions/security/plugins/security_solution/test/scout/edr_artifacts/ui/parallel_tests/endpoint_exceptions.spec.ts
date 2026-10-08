/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ARTIFACT_TAB_POLICY_DETAILS_LOCAL_TAGS,
  describeArtifactTabPolicyDetails,
} from '../fixtures/artifact_tabs_suite';
import { describeEndpointExceptionOrOperator } from '../fixtures/endpoint_exception_or_suite';
import { getArtifactTabCase } from '../fixtures/artifact_tabs_test_data';

const endpointExceptions = getArtifactTabCase('endpointExceptions');

// Same file on purpose: both suites mutate the agnostic endpoint exceptions
// list, which spaces do not isolate.
describeArtifactTabPolicyDetails(endpointExceptions, {
  tag: ARTIFACT_TAB_POLICY_DETAILS_LOCAL_TAGS,
});
describeEndpointExceptionOrOperator(endpointExceptions);
