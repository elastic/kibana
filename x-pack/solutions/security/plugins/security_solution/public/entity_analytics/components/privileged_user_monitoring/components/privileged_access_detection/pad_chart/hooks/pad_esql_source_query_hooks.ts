/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useIntervalForHeatmap } from './pad_heatmap_interval_hooks';
import { getPrivilegedMonitorUsersJoin } from '../../../../helpers';
import type { AnomalyBand } from '../pad_anomaly_bands';

const getHiddenBandsFilters = (anomalyBands: AnomalyBand[]) => {
  const hiddenBands = anomalyBands.filter((each) => each.hidden);
  const recordScoreFilterClause = (eachHiddenBand: AnomalyBand) =>
    `| WHERE record_score < ${eachHiddenBand.start} OR record_score >= ${eachHiddenBand.end} `;
  return hiddenBands.map(recordScoreFilterClause).join('');
};

/**
 * Currently, this query utilizes the `TOP` ES|QL command to filter for privileged users, and this effectively puts a cap on the number of data
 * sources, per `user.name`, this query supports. Right now, we have a total of 3 possible values ('integration', 'api', and 'csv'), so 100
 * is more than enough, and should likely suffice with the current architecture. If the `VALUES` ES|QL command is ever officially supported, this limitation would go away.
 */
const numberOfSupportedDataSources = 100;

export const usePadTopAnomalousUsersEsqlSource = ({
  jobIds,
  anomalyBands,
  spaceId,
  usersLimit,
}: {
  jobIds: string[];
  anomalyBands: AnomalyBand[];
  spaceId: string;
  usersLimit: number;
}) => {
  const formattedJobIds = jobIds.map((each) => `"${each}"`).join(', ');

  return `FROM .ml-anomalies-shared
    | WHERE job_id IN (${formattedJobIds})
    | WHERE record_score IS NOT NULL AND user.name IS NOT NULL
    ${getHiddenBandsFilters(anomalyBands)}
    ${getPrivilegedMonitorUsersJoin(spaceId)}
    | STATS max_record_score = MAX(record_score), user.is_privileged = TOP(user.is_privileged, ${numberOfSupportedDataSources}, "desc") by user.name
    | WHERE user.is_privileged == true
    | SORT max_record_score DESC
    | KEEP user.name
    | LIMIT ${usersLimit}`;
  // NOTE: the final `WHERE user.is_privileged == true` should not be necessary, as we've already performed the join and filtered by privileged users by that point. I believe this is a bug in ES|QL. This workaround doesn't cause any issues, however.
};

export const usePadAnomalyDataEsqlSource = ({
  jobIds,
  anomalyBands,
  spaceId,
  userNames,
}: {
  jobIds: string[];
  anomalyBands: AnomalyBand[];
  spaceId: string;
  userNames?: string[];
}) => {
  const interval = useIntervalForHeatmap();

  if (!userNames) return undefined;
  const formattedJobIds = jobIds.map((each) => `"${each}"`).join(', ');
  const formattedUserNames = userNames.map((each) => `"${each}"`).join(', ');

  return `FROM .ml-anomalies-shared
    | WHERE job_id IN (${formattedJobIds})
    | WHERE record_score IS NOT NULL AND user.name IS NOT NULL AND user.name IN (${formattedUserNames})
    ${getHiddenBandsFilters(anomalyBands)}
    ${getPrivilegedMonitorUsersJoin(spaceId)}
    | EVAL user_name_to_record_score = CONCAT(user.name, " : ", TO_STRING(record_score))
    | STATS user_name_to_record_score = VALUES(user_name_to_record_score) BY @timestamp = BUCKET(@timestamp, ${interval}h)
    | MV_EXPAND user_name_to_record_score
    | DISSECT user_name_to_record_score """%{user.name} : %{record_score}"""
    | EVAL record_score = TO_DOUBLE(record_score)
    | KEEP @timestamp, user.name, record_score
    | STATS record_score = MAX(record_score) BY @timestamp, user.name
    | SORT record_score DESC
`;
};
