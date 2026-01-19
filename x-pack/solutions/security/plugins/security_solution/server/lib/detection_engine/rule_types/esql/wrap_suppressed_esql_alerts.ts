/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqBy } from 'lodash';
import objectHash from 'object-hash';
import type { estypes } from '@elastic/elasticsearch';
import { TIMESTAMP } from '@kbn/rule-data-utils';
import type { SuppressionFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';

import type {
  DetectionAlertLatest,
  WrappedAlert,
} from '../../../../../common/api/detection_engine/model/alerts';
import type { EsqlRuleParams } from '../../rule_schema';
import { buildReasonMessageForNewTermsAlert } from '../utils/reason_formatters';
import { transformHitToAlert } from '../factories/utils/transform_hit_to_alert';
import type { SecuritySharedParams, SignalSource } from '../types';
import { getSuppressionAlertFields, getSuppressionTerms } from '../utils';
import { generateAlertId } from './utils';

export const wrapSuppressedEsqlAlerts = ({
  sharedParams,
  events,
  isRuleAggregating,
  expandedFields,
}: {
  sharedParams: SecuritySharedParams<EsqlRuleParams>;
  isRuleAggregating: boolean;
  events: Array<estypes.SearchHit<SignalSource>>;
  expandedFields: string[] | undefined;
}): Array<WrappedAlert<DetectionAlertLatest & SuppressionFieldsLatest>> => {
  const { spaceId, completeRule, tuple, primaryTimestamp, secondaryTimestamp } = sharedParams;
  const wrapped = events.map<WrappedAlert<DetectionAlertLatest & SuppressionFieldsLatest>>(
    (event, i) => {
      const combinedFields = { ...event?.fields, ...event._source };

      const suppressionTerms = getSuppressionTerms({
        alertSuppression: completeRule?.ruleParams?.alertSuppression,
        input: combinedFields,
      });

      const id = generateAlertId({
        event,
        spaceId,
        completeRule,
        tuple,
        isRuleAggregating,
        index: i,
        expandedFields,
      });

      const instanceId = objectHash([suppressionTerms, completeRule.alertId, spaceId]);

      const baseAlert: DetectionAlertLatest = transformHitToAlert({
        sharedParams,
        doc: event,
        applyOverrides: true,
        buildReasonMessage: buildReasonMessageForNewTermsAlert,
        alertUuid: id,
      });

      return {
        _id: id,
        _index: event._index ?? '',
        _source: {
          ...baseAlert,
          ...getSuppressionAlertFields({
            primaryTimestamp,
            secondaryTimestamp,
            fields: combinedFields,
            suppressionTerms,
            fallbackTimestamp: baseAlert[TIMESTAMP],
            instanceId,
          }),
        },
      };
    }
  );

  return uniqBy(wrapped, (alert) => alert._id);
};
