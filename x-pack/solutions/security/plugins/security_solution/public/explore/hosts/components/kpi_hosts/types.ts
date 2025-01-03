/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface HostsKpiProps {
  from: string;
  to: string;
}

export enum HostsKpiChartColors {
  uniqueSourceIps = '#D36086',
  uniqueDestinationIps = '#9170B8',
  hosts = '#6092C0',
}
