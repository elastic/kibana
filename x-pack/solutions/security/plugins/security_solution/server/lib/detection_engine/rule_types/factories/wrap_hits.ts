/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { SecuritySharedParams, SignalSource, SimpleHit } from '../types';
import { generateId } from '../utils/utils';
import { transformHitToAlert } from './utils/transform_hit_to_alert';
import type { BuildReasonMessage } from '../utils/reason_formatters';
import type {
  BaseFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/api/detection_engine/model/alerts';

export const wrapHits = (
  sharedParams: SecuritySharedParams,
  events: Array<estypes.SearchHit<SignalSource>>,
  buildReasonMessage: BuildReasonMessage
): Array<WrappedFieldsLatest<BaseFieldsLatest>> => {
  const wrappedDocs = events.map((event): WrappedFieldsLatest<BaseFieldsLatest> => {
    const id = generateId(
      event._index,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      event._id!,
      String(event._version),
      `${sharedParams.spaceId}:${sharedParams.completeRule.alertId}`
    );

    const baseAlert = transformHitToAlert({
      sharedParams,
      doc: event as SimpleHit,
      applyOverrides: true,
      buildReasonMessage,
      alertUuid: id,
    });

    return {
      _id: id,
      _index: '',
      _source: {
        ...baseAlert,
      },
    };
  });
  return wrappedDocs.filter(
    (doc) =>
      !doc._source['kibana.alert.ancestors'].some(
        (ancestor) => ancestor.rule === sharedParams.completeRule.alertId
      )
  );
};
