/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import fs from 'fs';
import { ScalabilitySetup } from './runner';

interface CapacityMetrics {
  rpsAtResponseTimeWarmupAvg: number;
  rpsAtSLA: number;
  rpsAtResponseTime10XAvg: number;
  rpsAtResponseTime100XAvg: number;
  rpsAtRequestsToActiveUsers: number;
  thresholdSLA: number;
}

const REQUESTS_REGEXP = /(?<=var requests = unpack\(\[)(.*)(?=\]\);)/g;
const RESPONSES_PERCENTILES_REGEXP =
  /(?<=var responsetimepercentilesovertimeokPercentiles = unpack\(\[)(.*)(?=\]\);)/g;
const ACTIVE_USERS_REGEXP = /(?<=data: \[  )(\[.*\])(?=\]\,tooltip)/g;

const findDataSet = (str: string, regex: RegExp) => {
  const found = str.match(regex);
  if (found == null) {
    throw Error('Failed to parse Html string');
  }
  return found[0]
    .replaceAll('],[', '].[')
    .split('.')
    .map((i) => {
      const pair = i
        .replaceAll(',[', '.[')
        .replaceAll(/^\[/g, '')
        .replaceAll(/\]$/g, '')
        .split('.');
      const arr = pair[1]?.replaceAll(/^\[/g, '')?.replaceAll(/\]$/g, '');
      const values: number[] = !arr ? [] : arr.split(',').map(Number);
      return { timestamp: parseInt(pair[0], 10), values };
    });
};

const getActiveUsers = (str: string, regex: RegExp) => {
  const found = str.match(regex);
  if (found == null) {
    throw Error('Failed to parse Html string');
  }
  const usersStr = found[0].split('],tooltip')[0];
  return usersStr
    .replaceAll('],[', '].[')
    .split('.')
    .map((i) => {
      const pair = i.replaceAll(/^\[/g, '').replaceAll(/\]$/g, '').split(',');
      return { key: pair[0].slice(0, -3), value: parseInt(pair[1], 10) };
    })
    .reduce((obj, item) => ({ ...obj, [item.key]: item.value }), {});
};

const getTimeThresholdFirstPassed = (
  dataSet: Array<{
    timestamp: number;
    value: number;
  }>,
  thresholdInMs: number
) => {
  const resultsAboveThreshold = dataSet.filter((i) => i.value >= thresholdInMs);
  if (resultsAboveThreshold.length > 0) {
    return resultsAboveThreshold[0].timestamp;
  } else return -1;
};

// const getTimeActiveUsersToReqCountThreshold = (
//   responses: Array<{
//     timestamp: number;
//     values: any;
//   }>,
//   threshold: number
// ) => {
//   const resultsAboveThreshold = responses.filter(
//     (i) => i.values.length > 0 && i.values[0] > i.values[1] * threshold
//   );
//   if (resultsAboveThreshold.length > 0) {
//     return resultsAboveThreshold[0].timestamp;
//   } else return -1;
// };

const getRPS = (
  time: number,
  dataSet: Array<{
    timestamp: number;
    values: any;
  }>,
  rpsMax: number
) => (time === -1 ? rpsMax : dataSet.find((i) => i.timestamp === time)?.values[1]);

export function getCapacityMetrics(
  htmlReportPath: string,
  scalabilitySetup: ScalabilitySetup,
  log: ToolingLog
): CapacityMetrics {
  const htmlContent = fs.readFileSync(htmlReportPath, 'utf-8').replace(/(\r\n|\n|\r)/gm, '');
  // [timestamp, [activeUsers,requests,0]], e.g. [1669026394,[6,6,0]]
  const requests = findDataSet(htmlContent, REQUESTS_REGEXP);
  // [timestamp, [min, 25%, 50%, 75%, 80%, 85%, 90%, 95%, 99%, max]], e.g. 1669026394,[9,11,11,12,13,13,14,15,15,16]
  const responsePercentiles = findDataSet(htmlContent, RESPONSES_PERCENTILES_REGEXP);

  const activeUsers: { [key: string]: number } = getActiveUsers(htmlContent, ACTIVE_USERS_REGEXP);
  log.info(JSON.stringify(activeUsers));
  const rpsMax = Math.max(...requests.filter((i) => i.values.length > 1).map((i) => i.values[1]));
  log.info(`rpsMax=${rpsMax}`);

  const warmupPhase = responsePercentiles.slice(0, 10);
  const rpsAtResponseTimeWarmupAvg = Math.round(
    warmupPhase
      .filter((i) => i.values.length > 0)
      .map((i) => i.values[3])
      .filter((i) => i > 0)
      .reduce((a, b) => a + b, 0) / warmupPhase.length
  );

  log.info(`Warmup: Avg 75 percentile response time - ${rpsAtResponseTimeWarmupAvg} ms`);

  // 1.SLA - constant value per api
  const responseThresholdSLA = scalabilitySetup.thresholdSLA || 3000;
  // 2. x10 increase
  const responseThresholdX10 = rpsAtResponseTimeWarmupAvg * 10;
  // 3. x100 increase
  const responseThresholdX100 = rpsAtResponseTimeWarmupAvg * 100;
  // 4. #users/#requests > 1.5-2
  const usersToReqThreshold = 1.5;
  // 5. abs(response/requests - 1) > 0.1
  // 6. time of first error
  // 7. t0 (average during startup)

  const maxResponses = responsePercentiles.map((i) => {
    return { timestamp: i.timestamp, value: i.values.length > 0 ? i.values[9] : 0 };
  });

  const timeSLA = getTimeThresholdFirstPassed(maxResponses, responseThresholdSLA);
  const timeX10 = getTimeThresholdFirstPassed(maxResponses, responseThresholdX10);
  const timeX100 = getTimeThresholdFirstPassed(maxResponses, responseThresholdX100);
  // const timeActiveUsersToReq = getTimeActiveUsersToReqCountThreshold(requests, usersToReqThreshold);

  const requestsAfterThreshold = requests.filter((i) => {
    const time = String(i.timestamp);
    const activeUsersInTime = activeUsers[time];
    return activeUsersInTime / i.values[0] > usersToReqThreshold;
  });

  const rpsAtRequestsToActiveUsers =
    requestsAfterThreshold.length > 0 ? requestsAfterThreshold[0].values[0] : rpsMax;

  return {
    rpsAtResponseTimeWarmupAvg,
    rpsAtSLA: getRPS(timeSLA, requests, rpsMax),
    rpsAtResponseTime10XAvg: getRPS(timeX10, requests, rpsMax),
    rpsAtResponseTime100XAvg: getRPS(timeX100, requests, rpsMax),
    rpsAtRequestsToActiveUsers,
    thresholdSLA: responseThresholdSLA,
  };
}
