/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScalabilitySetup } from '@kbn/journeys';

export interface ScalabilityJourney {
  journeyName: string;
  scalabilitySetup: ScalabilitySetup;
  testData?: {
    esArchives: string[];
    kbnArchives: string[];
  };
}

export interface CapacityMetrics {
  warmupAvgResponseTime: number;
  rpsAtWarmup: number;
  warmupDuration: number;
  rpsMax: number;
  responseTimeMetric: string;
  threshold1ResponseTime: number;
  rpsAtThreshold1: number;
  threshold2ResponseTime: number;
  rpsAtThreshold2: number;
  threshold3ResponseTime: number;
  rpsAtThreshold3: number;
}

export interface MetricEvent extends CapacityMetrics {
  eventName: string;
  eventType: string;
  journeyName: string;
  kibanaVersion: string;
  branch: string | undefined;
  ciBuildId: string | undefined;
  ciBuildJobId: string | undefined;
  ciBuildName: string | undefined;
  ciBuildNumber: number;
  gitRev: string | undefined;
}

export interface RpsMetric {
  timestamp: number;
  value: number;
}

export interface ResponseMetric {
  timestamp: number;
  metrics: {
    [k: string]: number;
  };
}

export interface DataPoint {
  timestamp: number;
  values: number[];
}
