/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import { EXCEPTION_LIST_NAMESPACE_AGNOSTIC } from '@kbn/securitysolution-list-constants';
import { savedObjectTypes } from '../../saved_objects';

// Same as the saved-object type for rules defined by Cloud Security Posture
const CLOUD_POSTURE_SAVED_OBJECT_RULE_TYPE = 'csp_rule';
const CLOUD_SECURITY_POSTURE_SETTINGS = 'cloud-security-posture-settings';
// Benchmark Rule Templates installed by the Cloud Security Posture package stored as Saved Objects:
const CLOUD_SECURITY_POSTURE_BENCHMARK_RULE_TEMPLATE = 'csp-rule-template';

export const securityDefaultSavedObjects = [
  'exception-list',
  EXCEPTION_LIST_NAMESPACE_AGNOSTIC,
  DATA_VIEW_SAVED_OBJECT_TYPE,
  ...savedObjectTypes,
  CLOUD_POSTURE_SAVED_OBJECT_RULE_TYPE,
  CLOUD_SECURITY_POSTURE_SETTINGS,
  CLOUD_SECURITY_POSTURE_BENCHMARK_RULE_TEMPLATE,
];
