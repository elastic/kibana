/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrivilegedMonitorUsersJoin } from '../../../helpers';
import { useIntervalForHeatmap } from './pad_chart';
import type { AnomalyBand } from './pad_anomaly_bands';

const getHiddenBandsFilters = (anomalyBands: AnomalyBand[]) => {
  const hiddenBands = anomalyBands.filter((each) => each.hidden);
  const recordScoreFilterClause = (eachHiddenBand: AnomalyBand) =>
    `| WHERE record_score < ${eachHiddenBand.start} OR record_score >= ${eachHiddenBand.end} `;
  return hiddenBands.map(recordScoreFilterClause).join('');
};

export const usePadAnomalyDataEsqlSource = (
  jobIds: string[],
  anomalyBands: AnomalyBand[],
  spaceId: string
) => {
  const interval = useIntervalForHeatmap();
  const formattedJobIds = jobIds.map((each) => `"${each}"`).join(', ');

  return `FROM .ml-anomalies-shared
    | WHERE job_id IN (${formattedJobIds})
    ${getPrivilegedMonitorUsersJoin(spaceId)}
    ${getHiddenBandsFilters(anomalyBands)}
    | WHERE record_score IS NOT NULL
    | EVAL user_name_to_record_score = CONCAT(user.name, " : ", TO_STRING(record_score))
    | STATS user_name_to_record_score = VALUES(user_name_to_record_score) BY @timestamp = BUCKET(@timestamp, ${interval}h)
    | MV_EXPAND user_name_to_record_score
    | DISSECT user_name_to_record_score """%{user.name} : %{record_score}"""
    | EVAL record_score = TO_DOUBLE(record_score)
    | KEEP @timestamp, user.name, record_score
    | WHERE user.name IS NOT NULL AND record_score IS NOT NULL
    | STATS record_score = MAX(record_score) BY @timestamp, user.name
    | SORT record_score DESC
`;
};
