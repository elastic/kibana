/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_REASON,
  ALERT_RISK_SCORE,
  ALERT_RULE_AUTHOR,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_CREATED_AT,
  ALERT_RULE_CREATED_BY,
  ALERT_RULE_DESCRIPTION,
  ALERT_RULE_ENABLED,
  ALERT_RULE_FROM,
  ALERT_RULE_INTERVAL,
  ALERT_RULE_LICENSE,
  ALERT_RULE_NAME,
  ALERT_RULE_NAMESPACE_FIELD,
  ALERT_RULE_NOTE,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_REFERENCES,
  ALERT_RULE_RULE_ID,
  ALERT_RULE_RULE_NAME_OVERRIDE,
  ALERT_RULE_TAGS,
  ALERT_RULE_TO,
  ALERT_RULE_TYPE,
  ALERT_RULE_UPDATED_AT,
  ALERT_RULE_UPDATED_BY,
  ALERT_RULE_UUID,
  ALERT_RULE_VERSION,
  ALERT_SEVERITY,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_URL,
  ALERT_UUID,
  ALERT_WORKFLOW_ASSIGNEE_IDS,
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_TAGS,
  EVENT_KIND,
  SPACE_IDS,
  TIMESTAMP,
  ALERT_INTENDED_TIMESTAMP,
  ALERT_RULE_EXECUTION_TYPE,
} from '@kbn/rule-data-utils';
import { flattenWithPrefix } from '@kbn/securitysolution-rules';
import { requiredOptional } from '@kbn/zod-helpers';

import { createHash } from 'crypto';

import { getAlertDetailsUrl } from '../../../../../../common/utils/alert_detail_path';
import type { SimpleHit } from '../../types';
import type { ThresholdResult } from '../../threshold/types';
import {
  getField,
  getValidDateFromDoc,
  isWrappedDetectionAlert,
  isWrappedSignalHit,
} from '../../utils/utils';
import { DEFAULT_ALERTS_INDEX, SERVER_APP_ID } from '../../../../../../common/constants';
import type { SearchTypes } from '../../../../telemetry/types';
import {
  ALERT_ANCESTORS,
  ALERT_DEPTH,
  ALERT_ORIGINAL_TIME,
  ALERT_BUILDING_BLOCK_TYPE,
  ALERT_RULE_ACTIONS,
  ALERT_RULE_INDICES,
  ALERT_RULE_THROTTLE,
  ALERT_RULE_TIMELINE_ID,
  ALERT_RULE_TIMELINE_TITLE,
  ALERT_RULE_META,
  ALERT_RULE_TIMESTAMP_OVERRIDE,
  ALERT_RULE_FALSE_POSITIVES,
  ALERT_RULE_MAX_SIGNALS,
  ALERT_RULE_RISK_SCORE_MAPPING,
  ALERT_RULE_SEVERITY_MAPPING,
  ALERT_RULE_THREAT,
  ALERT_RULE_EXCEPTIONS_LIST,
  ALERT_RULE_IMMUTABLE,
  LEGACY_ALERT_HOST_CRITICALITY,
  LEGACY_ALERT_USER_CRITICALITY,
  ALERT_HOST_CRITICALITY,
  ALERT_USER_CRITICALITY,
  ALERT_HOST_RISK_SCORE_CALCULATED_LEVEL,
  ALERT_HOST_RISK_SCORE_CALCULATED_SCORE_NORM,
  ALERT_USER_RISK_SCORE_CALCULATED_LEVEL,
  ALERT_USER_RISK_SCORE_CALCULATED_SCORE_NORM,
  ALERT_SERVICE_CRITICALITY,
  ALERT_SERVICE_RISK_SCORE_CALCULATED_LEVEL,
  ALERT_SERVICE_RISK_SCORE_CALCULATED_SCORE_NORM,
} from '../../../../../../common/field_maps/field_names';
import type { CompleteRule, RuleParams } from '../../../rule_schema';
import { commonParamsCamelToSnake, typeSpecificCamelToSnake } from '../../../rule_management';
import { transformAlertToRuleAction } from '../../../../../../common/detection_engine/transform_actions';
import type {
  AncestorLatest,
  BaseFieldsLatest,
} from '../../../../../../common/api/detection_engine/model/alerts';

export interface BuildAlertFieldsProps {
  docs: SimpleHit[];
  completeRule: CompleteRule<RuleParams>;
  spaceId: string | null | undefined;
  reason: string;
  indicesToQuery: string[];
  alertUuid: string;
  publicBaseUrl: string | undefined;
  alertTimestampOverride: Date | undefined;
  overrides?: {
    nameOverride: string;
    severityOverride: string;
    riskScoreOverride: number;
  };
  intendedTimestamp: Date | undefined;
}

export const generateAlertId = (alert: BaseFieldsLatest) => {
  return createHash('sha256')
    .update(
      alert[ALERT_ANCESTORS].reduce(
        (acc, ancestor) => acc.concat(ancestor.id, ancestor.index),
        ''
      ).concat(alert[ALERT_RULE_UUID])
    )
    .digest('hex');
};

/**
 * Takes an event document and extracts the information needed for the corresponding entry in the child
 * alert's ancestors array.
 * @param doc The parent event
 */
export const buildParent = (doc: SimpleHit): AncestorLatest => {
  const isSignal: boolean = isWrappedSignalHit(doc) || isWrappedDetectionAlert(doc);
  const parent: AncestorLatest = {
    id: doc._id,
    type: isSignal ? 'signal' : 'event',
    index: doc._index,
    depth: isSignal ? (getField(doc, ALERT_DEPTH) as number | undefined) ?? 1 : 0,
    rule: isSignal ? (getField(doc, ALERT_RULE_UUID) as string) : undefined,
  };
  return parent;
};

/**
 * Takes a parent event document with N ancestors and adds the parent document to the ancestry array,
 * creating an array of N+1 ancestors.
 * @param doc The parent event for which to extend the ancestry.
 */
export const buildAncestors = (doc: SimpleHit): AncestorLatest[] => {
  const newAncestor = buildParent(doc);
  const ancestorsField = getField(doc, ALERT_ANCESTORS);
  const existingAncestors: AncestorLatest[] = Array.isArray(ancestorsField) ? ancestorsField : [];
  return [...existingAncestors, newAncestor];
};

enum RULE_EXECUTION_TYPE {
  MANUAL = 'manual',
  SCHEDULED = 'scheduled',
}

/**
 * Builds the `kibana.alert.*` fields that are common across all alerts.
 * @param docs The parent alerts/events of the new alert to be built.
 * @param rule The rule that is generating the new alert.
 * @param spaceId The space ID in which the rule was executed.
 * @param reason Human readable string summarizing alert.
 * @param indicesToQuery Array of index patterns searched by the rule.
 */
export const buildAlertFields = ({
  docs,
  completeRule,
  spaceId,
  reason,
  indicesToQuery,
  alertUuid,
  publicBaseUrl,
  alertTimestampOverride,
  overrides,
  intendedTimestamp,
}: BuildAlertFieldsProps): BaseFieldsLatest => {
  const parents = docs.map(buildParent);
  const depth = parents.reduce((acc, parent) => Math.max(parent.depth, acc), 0) + 1;
  const ancestors = docs.reduce(
    (acc: AncestorLatest[], doc) => acc.concat(buildAncestors(doc)),
    []
  );

  const { output_index: outputIndex, ...commonRuleParams } = commonParamsCamelToSnake(
    completeRule.ruleParams
  );

  const ruleParamsSnakeCase = {
    ...commonRuleParams,
    ...typeSpecificCamelToSnake(completeRule.ruleParams),
  };

  const {
    actions,
    schedule,
    name,
    tags,
    enabled,
    createdBy,
    updatedBy,
    throttle,
    createdAt,
    updatedAt,
  } = completeRule.ruleConfig;

  const params = completeRule.ruleParams;

  const originalTime = getValidDateFromDoc({
    doc: docs[0],
    primaryTimestamp: TIMESTAMP,
  });

  const timestamp = alertTimestampOverride?.toISOString() ?? new Date().toISOString();

  const alertUrl = getAlertDetailsUrl({
    alertId: alertUuid,
    index: `${DEFAULT_ALERTS_INDEX}-${spaceId}`,
    timestamp,
    basePath: publicBaseUrl,
    spaceId,
  });

  return {
    [TIMESTAMP]: timestamp,
    [SPACE_IDS]: spaceId != null ? [spaceId] : [],
    [EVENT_KIND]: 'signal',
    [ALERT_ORIGINAL_TIME]: originalTime?.toISOString(),
    [ALERT_RULE_CONSUMER]: SERVER_APP_ID,
    [ALERT_ANCESTORS]: ancestors,
    [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
    [ALERT_WORKFLOW_STATUS]: 'open',
    [ALERT_DEPTH]: depth,
    [ALERT_REASON]: reason,
    [ALERT_BUILDING_BLOCK_TYPE]: params.buildingBlockType,
    [ALERT_SEVERITY]: overrides?.severityOverride ?? params.severity,
    [ALERT_RISK_SCORE]: overrides?.riskScoreOverride ?? params.riskScore,
    [ALERT_RULE_PARAMETERS]: ruleParamsSnakeCase,
    [ALERT_RULE_ACTIONS]: actions.map(transformAlertToRuleAction),
    [ALERT_RULE_AUTHOR]: params.author,
    [ALERT_RULE_CREATED_AT]: createdAt.toISOString(),
    [ALERT_RULE_CREATED_BY]: createdBy ?? '',
    [ALERT_RULE_DESCRIPTION]: params.description,
    [ALERT_RULE_ENABLED]: enabled,
    [ALERT_RULE_EXCEPTIONS_LIST]: params.exceptionsList,
    [ALERT_RULE_FALSE_POSITIVES]: params.falsePositives,
    [ALERT_RULE_FROM]: params.from,
    [ALERT_RULE_IMMUTABLE]: params.immutable,
    [ALERT_RULE_INTERVAL]: schedule.interval,
    [ALERT_RULE_INDICES]: indicesToQuery,
    [ALERT_RULE_LICENSE]: params.license,
    [ALERT_RULE_MAX_SIGNALS]: params.maxSignals,
    [ALERT_RULE_NAME]: overrides?.nameOverride ?? name,
    [ALERT_RULE_NAMESPACE_FIELD]: params.namespace,
    [ALERT_RULE_NOTE]: params.note,
    [ALERT_RULE_REFERENCES]: params.references,
    [ALERT_RULE_RISK_SCORE_MAPPING]: requiredOptional(params.riskScoreMapping),
    [ALERT_RULE_RULE_ID]: params.ruleId,
    [ALERT_RULE_RULE_NAME_OVERRIDE]: params.ruleNameOverride,
    [ALERT_RULE_SEVERITY_MAPPING]: params.severityMapping,
    [ALERT_RULE_TAGS]: tags,
    [ALERT_RULE_THREAT]: params.threat,
    [ALERT_RULE_THROTTLE]: throttle ?? undefined,
    [ALERT_RULE_TIMELINE_ID]: params.timelineId,
    [ALERT_RULE_TIMELINE_TITLE]: params.timelineTitle,
    [ALERT_RULE_TIMESTAMP_OVERRIDE]: params.timestampOverride,
    [ALERT_RULE_TO]: params.to,
    [ALERT_RULE_TYPE]: params.type,
    [ALERT_RULE_UPDATED_AT]: updatedAt.toISOString(),
    [ALERT_RULE_UPDATED_BY]: updatedBy ?? '',
    [ALERT_RULE_UUID]: completeRule.alertId,
    [ALERT_RULE_VERSION]: params.version,
    [ALERT_URL]: alertUrl,
    [ALERT_UUID]: alertUuid,
    [ALERT_WORKFLOW_TAGS]: [],
    [ALERT_WORKFLOW_ASSIGNEE_IDS]: [],
    ...flattenWithPrefix(ALERT_RULE_META, params.meta),
    // These fields don't exist in the mappings, but leaving here for now to limit changes to the alert building logic
    'kibana.alert.rule.risk_score': params.riskScore,
    'kibana.alert.rule.severity': params.severity,
    'kibana.alert.rule.building_block_type': params.buildingBlockType,
    // asset criticality fields will be enriched before ingestion
    [LEGACY_ALERT_HOST_CRITICALITY]: undefined,
    [LEGACY_ALERT_USER_CRITICALITY]: undefined,
    [ALERT_HOST_CRITICALITY]: undefined,
    [ALERT_USER_CRITICALITY]: undefined,
    [ALERT_SERVICE_CRITICALITY]: undefined,
    [ALERT_HOST_RISK_SCORE_CALCULATED_LEVEL]: undefined,
    [ALERT_HOST_RISK_SCORE_CALCULATED_SCORE_NORM]: undefined,
    [ALERT_USER_RISK_SCORE_CALCULATED_LEVEL]: undefined,
    [ALERT_USER_RISK_SCORE_CALCULATED_SCORE_NORM]: undefined,
    [ALERT_SERVICE_RISK_SCORE_CALCULATED_LEVEL]: undefined,
    [ALERT_SERVICE_RISK_SCORE_CALCULATED_SCORE_NORM]: undefined,
    [ALERT_INTENDED_TIMESTAMP]: intendedTimestamp ? intendedTimestamp.toISOString() : timestamp,
    [ALERT_RULE_EXECUTION_TYPE]: intendedTimestamp
      ? RULE_EXECUTION_TYPE.MANUAL
      : RULE_EXECUTION_TYPE.SCHEDULED,
  };
};

export const isThresholdResult = (
  thresholdResult: SearchTypes
): thresholdResult is ThresholdResult => {
  return typeof thresholdResult === 'object';
};
