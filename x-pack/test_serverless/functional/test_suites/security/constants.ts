/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SECURITY_ES_ARCHIVES_DIR = 'x-pack/test/security_solution_cypress/es_archives';
export const SECURITY_SOLUTION_DATA_VIEW =
  '.alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*,-*elastic-cloud-logs-*';

export const CLOUD_SECURITY_POSTURE_PACKAGE_VERSION = '1.13.0';
// This version of the CSPM package is used in the Serverless Quality Gates environment
// since our Serverless environment should be using the latest released version of the package
export const CLOUD_SECURITY_POSTURE_PACKAGE_VERSION_QUALITY_GATES = '1.13.0';
