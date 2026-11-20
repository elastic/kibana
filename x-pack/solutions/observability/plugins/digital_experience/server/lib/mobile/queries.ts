/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MOBILE_FIELDS } from '../../../common/mobile_panel';
import { ENVIRONMENT_FIELDS } from '../../../common/otel_data';
import { MAX_ENVIRONMENTS } from '../constants';

/** The most used combinations of the environment fields to read; `toEnvironments` caps the names. */
const MAX_ENVIRONMENT_ROWS = MAX_ENVIRONMENTS * MAX_ENVIRONMENTS;

/** The commands that count the documents per environment, by both environment fields. */
export const environmentsCommands = (): string[] => [
  `STATS docs = COUNT(*) BY ${ENVIRONMENT_FIELDS.join(', ')}`,
  'SORT docs DESC',
  `LIMIT ${MAX_ENVIRONMENT_ROWS}`,
];

const SESSIONS = `sessions = COUNT_DISTINCT(${MOBILE_FIELDS.sessionId})`;
const WITH_RELEASE = `WHERE ${MOBILE_FIELDS.serviceVersion} IS NOT NULL`;

/** The commands that count the sessions per release, most first (then the higher release). */
export const releasesCommands = (limit: number): string[] => [
  WITH_RELEASE,
  `STATS ${SESSIONS} BY release = ${MOBILE_FIELDS.serviceVersion}`,
  'SORT sessions DESC, release DESC',
  `LIMIT ${limit}`,
];

/**
 * The commands that pick each application's release with the most sessions, one row per
 * application, so no cut on releases can leave an application without one.
 */
export const latestReleaseCommands = (): string[] => [
  WITH_RELEASE,
  `STATS ${SESSIONS} BY ${MOBILE_FIELDS.serviceName}, release = ${MOBILE_FIELDS.serviceVersion}`,
  `STATS latest_release = TOP(sessions, 1, "desc", release) BY ${MOBILE_FIELDS.serviceName}`,
];
