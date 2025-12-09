/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import { EXCEPTION_LIST_NAMESPACE_AGNOSTIC } from '@kbn/securitysolution-list-constants';
import {
  timelineSavedObjectTypes,
  notesSavedObjectTypes,
  savedObjectTypes,
  exceptionsSavedObjectTypes,
} from '../../saved_objects';
import { noteType, pinnedEventType, timelineType } from '../timeline/saved_object_mappings';
import { prebuiltRuleAssetType } from '../detection_engine/prebuilt_rules';

// Same as the saved-object type for rules defined by Cloud Security Posture
const CLOUD_POSTURE_SAVED_OBJECT_RULE_TYPE = 'csp_rule';
const CLOUD_SECURITY_POSTURE_SETTINGS = 'cloud-security-posture-settings';
// Benchmark Rule Templates installed by the Cloud Security Posture package stored as Saved Objects:
const CLOUD_SECURITY_POSTURE_BENCHMARK_RULE_TEMPLATE = 'csp-rule-template';

export const securityV1SavedObjects = [
  'exception-list',
  EXCEPTION_LIST_NAMESPACE_AGNOSTIC,
  DATA_VIEW_SAVED_OBJECT_TYPE,
  CLOUD_POSTURE_SAVED_OBJECT_RULE_TYPE,
  CLOUD_SECURITY_POSTURE_SETTINGS,
  CLOUD_SECURITY_POSTURE_BENCHMARK_RULE_TEMPLATE,
  ...savedObjectTypes,
];

export const securityV2SavedObjects = [
  'exception-list',
  EXCEPTION_LIST_NAMESPACE_AGNOSTIC,
  DATA_VIEW_SAVED_OBJECT_TYPE,
  CLOUD_POSTURE_SAVED_OBJECT_RULE_TYPE,
  CLOUD_SECURITY_POSTURE_SETTINGS,
  CLOUD_SECURITY_POSTURE_BENCHMARK_RULE_TEMPLATE,
  ...savedObjectTypes.filter(
    (type) => ![noteType.name, pinnedEventType.name, timelineType.name].includes(type)
  ),
];

export const securityV3SavedObjects = [...securityV2SavedObjects];

export const securityV4SavedObjects = [...securityV3SavedObjects];

export const securityV5SavedObjects = [
  // The difference between v4 and v5 is that v5 removes the exceptions list SO
  // type and prebuilt rules which are now managed by the rules product feature
  DATA_VIEW_SAVED_OBJECT_TYPE,
  CLOUD_POSTURE_SAVED_OBJECT_RULE_TYPE,
  CLOUD_SECURITY_POSTURE_SETTINGS,
  CLOUD_SECURITY_POSTURE_BENCHMARK_RULE_TEMPLATE,
  EXCEPTION_LIST_NAMESPACE_AGNOSTIC,
  ...savedObjectTypes.filter(
    (type) =>
      ![
        noteType.name,
        pinnedEventType.name,
        timelineType.name,
        prebuiltRuleAssetType.name,
      ].includes(type)
  ),
];

export const securityTimelineSavedObjects = timelineSavedObjectTypes;

export const securityNotesSavedObjects = notesSavedObjectTypes;

export const rulesSavedObjects = ['exception-list', prebuiltRuleAssetType.name];
export const rulesV2SavedObjects = [prebuiltRuleAssetType.name];

export const securityExceptionsSavedObjects = exceptionsSavedObjectTypes;
