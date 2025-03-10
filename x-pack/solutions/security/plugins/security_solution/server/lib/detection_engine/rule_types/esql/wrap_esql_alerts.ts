/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import type {
  BaseFieldsLatest,
  WrappedFieldsLatest,
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
}: {
  sharedParams: SecuritySharedParams<EsqlRuleParams>;
  isRuleAggregating: boolean;
  events: Array<estypes.SearchHit<SignalSource>>;
}): Array<WrappedFieldsLatest<BaseFieldsLatest>> => {
  const wrapped = events.map<WrappedFieldsLatest<BaseFieldsLatest>>((event, i) => {
    const id = generateAlertId({
      event,
      spaceId: sharedParams.spaceId,
      completeRule: sharedParams.completeRule,
      tuple: sharedParams.tuple,
      isRuleAggregating,
      index: i,
    });

    const baseAlert: BaseFieldsLatest = transformHitToAlert({
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
      },
    };
  });

  return wrapped;
};
