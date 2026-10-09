/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum UniversalProfilingAddDataTabs {
  Kubernetes = 'kubernetes',
  Docker = 'docker',
  Binary = 'binary',
  Deb = 'deb',
  RPM = 'rpm',
  ElasticAgentIntegration = 'elasticAgentIntegration',
  Symbols = 'symbols',
}

export const DEFAULT_UNIVERSAL_PROFILING_ADD_DATA_TAB = UniversalProfilingAddDataTabs.Kubernetes;

export interface UniversalProfilingAddDataStep {
  title: string;
  content: string | React.ReactNode;
}

export interface UniversalProfilingAddDataTab<TKey extends string = string> {
  key: TKey;
  title: string;
  steps?: UniversalProfilingAddDataStep[];
  subTabs?: UniversalProfilingAddDataTab[];
}
