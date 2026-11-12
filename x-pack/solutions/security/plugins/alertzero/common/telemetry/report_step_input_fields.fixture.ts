/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A valid step input per event a Worker declares, without `event`. */
export type ReportableEventFixtures<Outcomes> = Readonly<
  Record<keyof Outcomes, Readonly<Record<string, unknown>>>
>;

/** A random Investigation id, as most Workers mint. */
export const INVESTIGATION_ID_FIXTURE = '0b9f4a3e-1c2d-8e3f-8a4b-5c6d7e8f9a0b';

/** A UUID v5, as the Hunt Worker mints for its Investigations. */
export const UUID_V5_INVESTIGATION_ID_FIXTURE = '3f1c2b4a-5d6e-5f70-8a9b-0c1d2e3f4a5b';
