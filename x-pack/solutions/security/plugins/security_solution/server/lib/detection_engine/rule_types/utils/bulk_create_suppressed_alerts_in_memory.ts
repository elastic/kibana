/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SuppressedAlertService } from '@kbn/rule-registry-plugin/server';

import type { SuppressionFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';
import type { EqlHitsSequence } from '@elastic/elasticsearch/lib/api/types';

import type {
  SearchAfterAndBulkCreateParams,
  SearchAfterAndBulkCreateReturnType,
  WrapSuppressedHits,
  SignalSourceHit,
  SignalSource,
} from '../types';
import { MAX_SIGNALS_SUPPRESSION_MULTIPLIER } from '../constants';
import type { SharedParams } from './utils';
import { addToSearchAfterReturn, buildShellAlertSuppressionTermsAndFields } from './utils';
import type { AlertSuppressionCamel } from '../../../../../common/api/detection_engine/model/rule_schema';
import { DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY } from '../../../../../common/detection_engine/constants';
import { partitionMissingFieldsEvents } from './partition_missing_fields_events';
import { AlertSuppressionMissingFieldsStrategyEnum } from '../../../../../common/api/detection_engine/model/rule_schema';
import { createEnrichEventsFunction } from './enrichments';
import { bulkCreateWithSuppression } from './bulk_create_with_suppression';
import type { ExperimentalFeatures } from '../../../../../common';

import type {
  BaseFieldsLatest,
  EqlBuildingBlockFieldsLatest,
  EqlShellFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/api/detection_engine/model/alerts';
import { robustGet } from './source_fields_merging/utils/robust_field_access';
import { buildAlertGroupFromSequence } from '../eql/build_alert_group_from_sequence';

interface SearchAfterAndBulkCreateSuppressedAlertsParams extends SearchAfterAndBulkCreateParams {
  wrapSuppressedHits: WrapSuppressedHits;
  alertTimestampOverride: Date | undefined;
  alertWithSuppression: SuppressedAlertService;
  alertSuppression?: AlertSuppressionCamel;
}
export interface BulkCreateSuppressedAlertsParams
  extends Pick<
    SearchAfterAndBulkCreateSuppressedAlertsParams,
    | 'wrapHits'
    | 'bulkCreate'
    | 'services'
    | 'buildReasonMessage'
    | 'ruleExecutionLogger'
    | 'tuple'
    | 'alertSuppression'
    | 'wrapSuppressedHits'
    | 'alertWithSuppression'
    | 'alertTimestampOverride'
  > {
  enrichedEvents: SignalSourceHit[];
  toReturn: SearchAfterAndBulkCreateReturnType;
  experimentalFeatures: ExperimentalFeatures;
  mergeSourceAndFields?: boolean;
  maxNumberOfAlertsMultiplier?: number;
}

export interface BulkCreateSuppressedSequencesParams
  extends Pick<
    SearchAfterAndBulkCreateSuppressedAlertsParams,
    | 'bulkCreate'
    | 'services'
    | 'buildReasonMessage'
    | 'ruleExecutionLogger'
    | 'tuple'
    | 'alertSuppression'
    | 'alertWithSuppression'
    | 'alertTimestampOverride'
  > {
  sequences: Array<EqlHitsSequence<SignalSource>>;
  buildingBlockAlerts?: Array<WrappedFieldsLatest<BaseFieldsLatest>>;
  toReturn: SearchAfterAndBulkCreateReturnType;
  experimentalFeatures: ExperimentalFeatures;
  maxNumberOfAlertsMultiplier?: number;
  sharedParams: SharedParams;
  alertSuppression: AlertSuppressionCamel;
}
/**
 * wraps, bulk create and suppress alerts in memory, also takes care of missing fields logic.
 * If parameter alertSuppression.missingFieldsStrategy configured not to be suppressed,
 * regular alerts will be created for such events without suppression
 */
export const bulkCreateSuppressedAlertsInMemory = async ({
  enrichedEvents,
  toReturn,
  wrapHits,
  bulkCreate,
  services,
  buildReasonMessage,
  ruleExecutionLogger,
  tuple,
  alertSuppression,
  wrapSuppressedHits,
  alertWithSuppression,
  alertTimestampOverride,
  experimentalFeatures,
  mergeSourceAndFields = false,
  maxNumberOfAlertsMultiplier,
}: BulkCreateSuppressedAlertsParams) => {
  const suppressOnMissingFields =
    (alertSuppression?.missingFieldsStrategy ?? DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY) ===
    AlertSuppressionMissingFieldsStrategyEnum.suppress;

  let suppressibleEvents = enrichedEvents;
  let unsuppressibleWrappedDocs: Array<WrappedFieldsLatest<BaseFieldsLatest>> = [];

  if (!suppressOnMissingFields) {
    const partitionedEvents = partitionMissingFieldsEvents(
      enrichedEvents,
      alertSuppression?.groupBy || [],
      ['fields'],
      mergeSourceAndFields
    );

    unsuppressibleWrappedDocs = wrapHits(partitionedEvents[1], buildReasonMessage);
    suppressibleEvents = partitionedEvents[0];
  }

  const suppressibleWrappedDocs = wrapSuppressedHits(suppressibleEvents, buildReasonMessage);

  return executeBulkCreateAlerts({
    suppressibleWrappedDocs,
    unsuppressibleWrappedDocs,
    toReturn,
    bulkCreate,
    services,
    ruleExecutionLogger,
    tuple,
    alertSuppression,
    alertWithSuppression,
    alertTimestampOverride,
    experimentalFeatures,
    maxNumberOfAlertsMultiplier,
  });
};

/**
 * wraps, bulk create and suppress alerts in memory, also takes care of missing fields logic.
 * If parameter alertSuppression.missingFieldsStrategy configured not to be suppressed,
 * regular alerts will be created for such events without suppression
 */
export const bulkCreateSuppressedSequencesInMemory = async ({
  sequences,
  toReturn,
  bulkCreate,
  services,
  ruleExecutionLogger,
  tuple,
  alertSuppression,
  buildReasonMessage,
  sharedParams,
  alertWithSuppression,
  alertTimestampOverride,
  experimentalFeatures,
  maxNumberOfAlertsMultiplier,
}: BulkCreateSuppressedSequencesParams) => {
  const suppressOnMissingFields =
    (alertSuppression.missingFieldsStrategy ?? DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY) ===
    AlertSuppressionMissingFieldsStrategyEnum.suppress;

  const suppressibleWrappedSequences: Array<
    WrappedFieldsLatest<EqlShellFieldsLatest & SuppressionFieldsLatest> & {
      subAlerts: Array<WrappedFieldsLatest<EqlBuildingBlockFieldsLatest>>;
    }
  > = [];
  const unsuppressibleWrappedDocs: Array<WrappedFieldsLatest<BaseFieldsLatest>> = [];

  sequences.forEach((sequence) => {
    const alertGroupFromSequence = buildAlertGroupFromSequence({
      sequence,
      applyOverrides: true,
      buildReasonMessage,
      ...sharedParams,
    });
    const shellAlert = alertGroupFromSequence.shellAlert;
    const buildingBlocks = alertGroupFromSequence.buildingBlocks;
    if (shellAlert) {
      if (!suppressOnMissingFields) {
        // does the shell alert have all the suppression fields?
        const hasEverySuppressionField = alertSuppression.groupBy.every(
          (suppressionPath) =>
            robustGet({ key: suppressionPath, document: shellAlert._source }) != null
        );
        if (!hasEverySuppressionField) {
          unsuppressibleWrappedDocs.push(shellAlert, ...buildingBlocks);
        } else {
          const wrappedWithSuppressionTerms = buildShellAlertSuppressionTermsAndFields({
            shellAlert,
            buildingBlockAlerts: buildingBlocks,
            ...sharedParams,
          });
          suppressibleWrappedSequences.push(wrappedWithSuppressionTerms);
        }
      } else {
        const wrappedWithSuppressionTerms = buildShellAlertSuppressionTermsAndFields({
          shellAlert,
          buildingBlockAlerts: buildingBlocks,
          ...sharedParams,
        });
        suppressibleWrappedSequences.push(wrappedWithSuppressionTerms);
      }
    }
  });

  return executeBulkCreateAlerts({
    suppressibleWrappedDocs: suppressibleWrappedSequences,
    unsuppressibleWrappedDocs,
    toReturn,
    bulkCreate,
    services,
    ruleExecutionLogger,
    tuple,
    alertSuppression,
    alertWithSuppression,
    alertTimestampOverride,
    experimentalFeatures,
    maxNumberOfAlertsMultiplier,
  });
};

export interface ExecuteBulkCreateAlertsParams<T extends SuppressionFieldsLatest & BaseFieldsLatest>
  extends Pick<
    SearchAfterAndBulkCreateSuppressedAlertsParams,
    | 'bulkCreate'
    | 'services'
    | 'ruleExecutionLogger'
    | 'tuple'
    | 'alertSuppression'
    | 'alertWithSuppression'
    | 'alertTimestampOverride'
  > {
  unsuppressibleWrappedDocs: Array<WrappedFieldsLatest<BaseFieldsLatest>>;
  suppressibleWrappedDocs: Array<WrappedFieldsLatest<T>>;
  toReturn: SearchAfterAndBulkCreateReturnType;
  experimentalFeatures: ExperimentalFeatures;
  maxNumberOfAlertsMultiplier?: number;
}

/**
 * creates alerts in ES, both suppressed and unsuppressed
 */
export const executeBulkCreateAlerts = async <
  T extends SuppressionFieldsLatest & BaseFieldsLatest
>({
  unsuppressibleWrappedDocs,
  suppressibleWrappedDocs,
  toReturn,
  bulkCreate,
  services,
  ruleExecutionLogger,
  tuple,
  alertSuppression,
  alertWithSuppression,
  alertTimestampOverride,
  experimentalFeatures,
  maxNumberOfAlertsMultiplier = MAX_SIGNALS_SUPPRESSION_MULTIPLIER,
}: ExecuteBulkCreateAlertsParams<T>) => {
  // max signals for suppression includes suppressed and created alerts
  // this allows to lift max signals limitation to higher value
  // and can detects events beyond default max_signals value
  const suppressionMaxSignals = maxNumberOfAlertsMultiplier * tuple.maxSignals;
  const suppressionDuration = alertSuppression?.duration;

  const suppressionWindow = suppressionDuration
    ? `now-${suppressionDuration.value}${suppressionDuration.unit}`
    : tuple.from.toISOString();

  if (unsuppressibleWrappedDocs.length) {
    const unsuppressedResult = await bulkCreate(
      unsuppressibleWrappedDocs,
      tuple.maxSignals - toReturn.createdSignalsCount,
      createEnrichEventsFunction({
        services,
        logger: ruleExecutionLogger,
      })
    );

    addToSearchAfterReturn({ current: toReturn, next: unsuppressedResult });
  }

  const bulkCreateResult = await bulkCreateWithSuppression({
    alertWithSuppression,
    ruleExecutionLogger,
    wrappedDocs: suppressibleWrappedDocs,
    services,
    suppressionWindow,
    alertTimestampOverride,
    isSuppressionPerRuleExecution: !suppressionDuration,
    maxAlerts: tuple.maxSignals - toReturn.createdSignalsCount,
    experimentalFeatures,
  });

  addToSearchAfterReturn({ current: toReturn, next: bulkCreateResult });

  const alertsWereTruncated =
    (toReturn.suppressedAlertsCount ?? 0) + toReturn.createdSignalsCount >= suppressionMaxSignals ||
    toReturn.createdSignalsCount >= tuple.maxSignals;

  return {
    ...bulkCreateResult,
    alertsWereTruncated,
  };
};
