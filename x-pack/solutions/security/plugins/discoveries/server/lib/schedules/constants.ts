/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ATTACK_DISCOVERY_SCHEDULE_TAG = 'attack-discovery-schedule';

export const SCHEDULES_BASE_PATH = '/internal/attack_discovery/schedules';
export const SCHEDULES_BY_ID_PATH = `${SCHEDULES_BASE_PATH}/{id}`;
export const SCHEDULES_FIND_PATH = `${SCHEDULES_BASE_PATH}/_find`;
export const SCHEDULES_ENABLE_PATH = `${SCHEDULES_BY_ID_PATH}/_enable`;
export const SCHEDULES_DISABLE_PATH = `${SCHEDULES_BY_ID_PATH}/_disable`;
