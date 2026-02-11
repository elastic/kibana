/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TIMEOUT_MS: number = 600000; // 10 minutes

export const COMMON_DATASTREAM_NAME: string = 'logs-elastic_agent.cloudbeat-test';
export const USER_INDEX_NAME: string = '.entities.v1.latest.security_user_default';
export const HOST_INDEX_NAME: string = '.entities.v1.latest.security_host_default';
export const SERVICE_INDEX_NAME: string = '.entities.v1.latest.security_service_default';

export const USER_TRANSFORM_ID: string = 'entities-v1-latest-security_user_default';
export const HOST_TRANSFORM_ID: string = 'entities-v1-latest-security_host_default';
export const SERVICE_TRANSFORM_ID: string = 'entities-v1-latest-security_service_default';
