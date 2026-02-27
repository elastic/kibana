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
  DetectionAlertLatest,
  WrappedAlert,
} from '../../../../../common/api/detection_engine/model/alerts';

/**
 * wrapHits is responsible for turning source events into alerts. Since we copy the source data into the alert, we are
 * effectively "wrapping" the source hits by adding alert metadata to them in `kibana.alert.*` fields and
 * generating an _id for the alert,
 * @param sharedParams SecuritySharedParams passed in from the common security rule wrapper logic
 * @param events Source events to turn into alerts
 * @param buildReasonMessage Function to generate the reason message based on source data
 * @returns Alerts ready to index
 */
export const wrapHits = (
  sharedParams: SecuritySharedParams,
  events: Array<estypes.SearchHit<SignalSource>>,
  buildReasonMessage: BuildReasonMessage
): Array<WrappedAlert<DetectionAlertLatest>> => {
  const wrappedDocs = events.map((event): WrappedAlert<DetectionAlertLatest> => {
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
