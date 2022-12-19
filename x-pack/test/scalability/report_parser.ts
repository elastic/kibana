/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import fs from 'fs';
import { ScalabilitySetup } from '@kbn/journeys';

interface CapacityMetrics {
  rpsAtResponseTimeWarmupAvg: number;
  rpsAtSLA: number;
  rpsAtResponseTime10XAvg: number;
  rpsAtResponseTime100XAvg: number;
  rpsAtRequestsToActiveUsers: number;
  thresholdSLA: number;
}

const responseTimeMetrics = ['min', '25%', '50%', '75%', '80%', '85%', '90%', '95%', '99%', 'max'];
const rpsMetrics = ['activeUsers', 'requests', 'ground'];
const responseTimeThresholds = 3000;
const collectedPct = '85%';

interface DataPoint {
  timestamp: number;
  values: number[];
}

const REQUESTS_REGEXP = /(?<=var requests = unpack\(\[)(.*)(?=\]\);)/g;
const RESPONSES_PERCENTILES_REGEXP =
  /(?<=var responsetimepercentilesovertimeokPercentiles = unpack\(\[)(.*)(?=\]\);)/g;

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

const getThresholdTimePoint = (
  data: Array<{
    timestamp: number;
    metrics: {
      [k: string]: number;
    };
  }>,
  metricName: string,
  thresholdInMs: number
) => {
  const resultsAboveThreshold = data.filter((i) => i.metrics[metricName] >= thresholdInMs);
  if (resultsAboveThreshold.length > 0) {
    return resultsAboveThreshold[0].timestamp;
  } else return -1;
};

const getRPS = (
  time: number,
  data: Array<{
    timestamp: number;
    metrics: {
      [k: string]: number;
    };
  }>,
  rpsMax: number
) => (time === -1 ? rpsMax : data.find((i) => i.timestamp === time)?.metrics.requests || 0);

const mapValuesWithMetrics = (data: DataPoint[], metrics: string[]) => {
  return data
    .filter((i) => i.values.length === metrics.length)
    .map((i) => {
      return {
        timestamp: i.timestamp,
        metrics: Object.fromEntries(metrics.map((_, index) => [metrics[index], i.values[index]])),
      };
    });
};

export function getCapacityMetrics(
  htmlReportPath: string,
  scalabilitySetup: ScalabilitySetup,
  log: ToolingLog
): CapacityMetrics {
  const htmlContent = fs.readFileSync(htmlReportPath, 'utf-8');
  // [timestamp, [activeUsers,requests,0]], e.g. [1669026394,[6,6,0]]
  const requests = findDataSet(htmlContent, REQUESTS_REGEXP);
  // [timestamp, [min, 25%, 50%, 75%, 80%, 85%, 90%, 95%, 99%, max]], e.g. 1669026394,[9,11,11,12,13,13,14,15,15,16]
  const responsePercentiles = findDataSet(htmlContent, RESPONSES_PERCENTILES_REGEXP);

  // warmup phase duration in seconds
  const warmupDuration = scalabilitySetup.warmup
    .map((action) => {
      const parsedValue = parseInt(action.duration.replace(/s|m/, ''), 10);
      return action.duration.endsWith('m') ? parsedValue * 60 : parsedValue;
    })
    .reduce((a, b) => a + b, 0);

  const warmupData = mapValuesWithMetrics(
    responsePercentiles.slice(0, warmupDuration),
    responseTimeMetrics
  );
  const testData = mapValuesWithMetrics(
    responsePercentiles.slice(warmupDuration, responsePercentiles.length - 1),
    responseTimeMetrics
  );
  const rpsData = mapValuesWithMetrics(requests, rpsMetrics);

  const rpsMax = Math.max(...rpsData.map((i) => i.metrics.requests));
  log.info(`rpsMax=${rpsMax}`);

  const avgWarmupResponseTime = Math.round(
    warmupData
      .map((i) => i.metrics[collectedPct])
      .reduce((avg, value, _, { length }) => {
        return avg + value / length;
      }, 0)
  );
  log.info(`Warmup: Avg ${collectedPct} percentile response time - ${avgWarmupResponseTime} ms`);

  const responseThresholdSLA = scalabilitySetup.thresholds || responseTimeThresholds;
  const avgWarmupResponseTimeX10 = avgWarmupResponseTime * 10;
  const avgWarmupResponseTimeX100 = avgWarmupResponseTime * 100;

  const timeSLA = getThresholdTimePoint(testData, collectedPct, responseThresholdSLA);
  const timeX10 = getThresholdTimePoint(testData, collectedPct, avgWarmupResponseTimeX10);
  const timeX100 = getThresholdTimePoint(testData, collectedPct, avgWarmupResponseTimeX100);

  return {
    rpsAtResponseTimeWarmupAvg: avgWarmupResponseTime,
    rpsAtSLA: getRPS(timeSLA, rpsData, rpsMax),
    rpsAtResponseTime10XAvg: getRPS(timeX10, rpsData, rpsMax),
    rpsAtResponseTime100XAvg: getRPS(timeX100, rpsData, rpsMax),
    rpsAtRequestsToActiveUsers: 0,
    thresholdSLA: responseThresholdSLA,
  };
}
