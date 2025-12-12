/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { uniqBy } from 'lodash';

import type {
  DetectionAlertLatest,
  WrappedAlert,
} from '../../../../../common/api/detection_engine/model/alerts';
import type { EsqlRuleParams } from '../../rule_schema';
import { buildReasonMessageForNewTermsAlert } from '../utils/reason_formatters';
import { transformHitToAlert } from '../factories/utils/transform_hit_to_alert';
import type { SecuritySharedParams, SignalSource } from '../types';
import { generateAlertId } from './utils';

export const wrapEsqlAlerts = ({
  sharedParams,
  events,
  isRuleAggregating,
  expandedFields,
}: {
  sharedParams: SecuritySharedParams<EsqlRuleParams>;
  isRuleAggregating: boolean;
  events: Array<estypes.SearchHit<SignalSource>>;
  expandedFields: string[] | undefined;
}): Array<WrappedAlert<DetectionAlertLatest>> => {
  const wrapped = events.map<WrappedAlert<DetectionAlertLatest>>((event, i) => {
    const id = generateAlertId({
      event,
      spaceId: sharedParams.spaceId,
      completeRule: sharedParams.completeRule,
      tuple: sharedParams.tuple,
      isRuleAggregating,
      index: i,
      expandedFields,
    });

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
      _source: baseAlert,
    };
  });

  return uniqBy(wrapped, (alert) => alert._id);
};
