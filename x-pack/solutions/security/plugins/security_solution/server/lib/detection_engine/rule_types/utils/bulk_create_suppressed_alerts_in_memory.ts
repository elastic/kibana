/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SuppressionFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';
import type { EqlHitsSequence } from '@elastic/elasticsearch/lib/api/types';

import type {
  SearchAfterAndBulkCreateParams,
  SearchAfterAndBulkCreateReturnType,
  WrapSuppressedHits,
  SignalSourceHit,
  SignalSource,
  SecuritySharedParams,
} from '../types';
import { MAX_SIGNALS_SUPPRESSION_MULTIPLIER } from '../constants';
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
import type { EqlRuleParams } from '../../rule_schema';

interface SearchAfterAndBulkCreateSuppressedAlertsParams extends SearchAfterAndBulkCreateParams {
  wrapSuppressedHits: WrapSuppressedHits;
  alertSuppression?: AlertSuppressionCamel;
}
export interface BulkCreateSuppressedAlertsParams
  extends Pick<
    SearchAfterAndBulkCreateSuppressedAlertsParams,
    'services' | 'buildReasonMessage' | 'alertSuppression' | 'wrapSuppressedHits' | 'sharedParams'
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
    'services' | 'buildReasonMessage' | 'alertSuppression'
  > {
  sharedParams: SecuritySharedParams<EqlRuleParams>;
  sequences: Array<EqlHitsSequence<SignalSource>>;
  buildingBlockAlerts?: Array<WrappedFieldsLatest<BaseFieldsLatest>>;
  toReturn: SearchAfterAndBulkCreateReturnType;
  experimentalFeatures: ExperimentalFeatures;
  maxNumberOfAlertsMultiplier?: number;
  alertSuppression: AlertSuppressionCamel;
}
/**
 * wraps, bulk create and suppress alerts in memory, also takes care of missing fields logic.
 * If parameter alertSuppression.missingFieldsStrategy configured not to be suppressed,
 * regular alerts will be created for such events without suppression
 */
export const bulkCreateSuppressedAlertsInMemory = async ({
  sharedParams,
  enrichedEvents,
  toReturn,
  services,
  buildReasonMessage,
  alertSuppression,
  wrapSuppressedHits,
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

    unsuppressibleWrappedDocs = sharedParams.wrapHits(partitionedEvents[1], buildReasonMessage);
    suppressibleEvents = partitionedEvents[0];
  }

  const suppressibleWrappedDocs = wrapSuppressedHits(suppressibleEvents, buildReasonMessage);

  return executeBulkCreateAlerts({
    sharedParams,
    suppressibleWrappedDocs,
    unsuppressibleWrappedDocs,
    toReturn,
    services,
    alertSuppression,
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
  sharedParams,
  sequences,
  toReturn,
  services,
  alertSuppression,
  buildReasonMessage,
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
      sharedParams,
      sequence,
      applyOverrides: true,
      buildReasonMessage,
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
            sharedParams,
            shellAlert,
            buildingBlockAlerts: buildingBlocks,
          });
          suppressibleWrappedSequences.push(wrappedWithSuppressionTerms);
        }
      } else {
        const wrappedWithSuppressionTerms = buildShellAlertSuppressionTermsAndFields({
          sharedParams,
          shellAlert,
          buildingBlockAlerts: buildingBlocks,
        });
        suppressibleWrappedSequences.push(wrappedWithSuppressionTerms);
      }
    }
  });

  return executeBulkCreateAlerts({
    sharedParams,
    suppressibleWrappedDocs: suppressibleWrappedSequences,
    unsuppressibleWrappedDocs,
    toReturn,
    services,
    alertSuppression,
    experimentalFeatures,
    maxNumberOfAlertsMultiplier,
  });
};

export interface ExecuteBulkCreateAlertsParams<T extends SuppressionFieldsLatest & BaseFieldsLatest>
  extends Pick<
    SearchAfterAndBulkCreateSuppressedAlertsParams,
    'services' | 'sharedParams' | 'alertSuppression'
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
  sharedParams,
  unsuppressibleWrappedDocs,
  suppressibleWrappedDocs,
  toReturn,
  services,
  alertSuppression,
  experimentalFeatures,
  maxNumberOfAlertsMultiplier = MAX_SIGNALS_SUPPRESSION_MULTIPLIER,
}: ExecuteBulkCreateAlertsParams<T>) => {
  const { tuple, bulkCreate, ruleExecutionLogger } = sharedParams;
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
    sharedParams,
    wrappedDocs: suppressibleWrappedDocs,
    services,
    suppressionWindow,
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
