/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { estypes } from '@elastic/elasticsearch';
import { flow, omit } from 'lodash/fp';
import set from 'set-value';

import { wrapHits, type GenericBulkCreateResponse, bulkCreate } from '../factories';
import type { Anomaly } from '../../../machine_learning';
import type { SecurityRuleServices, SecuritySharedParams } from '../types';
import type { MachineLearningRuleParams } from '../../rule_schema';
import { buildReasonMessageForMlAlert } from '../utils/reason_formatters';
import type { DetectionAlertLatest } from '../../../../../common/api/detection_engine/model/alerts';

interface EcsAnomaly extends Anomaly {
  '@timestamp': string;
}

export const transformAnomalyFieldsToEcs = (anomaly: Anomaly): EcsAnomaly => {
  const {
    by_field_name: entityName,
    by_field_value: entityValue,
    influencers,
    timestamp,
  } = anomaly;
  let errantFields = (influencers ?? []).map((influencer) => ({
    name: influencer.influencer_field_name,
    value: influencer.influencer_field_values,
  }));

  if (entityName && entityValue) {
    errantFields = [...errantFields, { name: entityName, value: [entityValue] }];
  }

  const omitDottedFields = omit(errantFields.map((field) => field.name));
  const setNestedFields = errantFields.map(
    (field) => (_anomaly: Anomaly) => set(_anomaly, field.name, field.value)
  );
  const setTimestamp = (_anomaly: Anomaly) =>
    set(_anomaly, '@timestamp', new Date(timestamp).toISOString());

  return flow(omitDottedFields, setNestedFields, setTimestamp)(anomaly);
};

const transformAnomalyResultsToEcs = (
  results: Array<estypes.SearchHit<Anomaly>>
): Array<estypes.SearchHit<EcsAnomaly>> => {
  return results.map(({ _source, ...rest }) => ({
    ...rest,
    _source: transformAnomalyFieldsToEcs(
      // @ts-expect-error @elastic/elasticsearch _source is optional
      _source
    ),
  }));
};

export const bulkCreateMlSignals = async ({
  sharedParams,
  anomalyHits,
  services,
}: {
  sharedParams: SecuritySharedParams<MachineLearningRuleParams>;
  anomalyHits: Array<estypes.SearchHit<Anomaly>>;
  services: SecurityRuleServices;
}): Promise<GenericBulkCreateResponse<DetectionAlertLatest>> => {
  const ecsResults = transformAnomalyResultsToEcs(anomalyHits);

  const wrappedDocs = wrapHits(sharedParams, ecsResults, buildReasonMessageForMlAlert);
  return bulkCreate({
    wrappedAlerts: wrappedDocs,
    sharedParams,
    services,
  });
};
