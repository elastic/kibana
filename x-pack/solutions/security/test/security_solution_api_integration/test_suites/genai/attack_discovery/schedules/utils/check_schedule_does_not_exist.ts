/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import { getAttackDiscoverySchedulesApis } from './apis';
import { getScheduleNotFoundError } from './helpers';

type AttackDiscoverySchedulesSupertest = Parameters<
  typeof getAttackDiscoverySchedulesApis
>[0]['supertest'];
type GetAttackDiscoverySchedulesService = (
  service: 'supertest'
) => AttackDiscoverySchedulesSupertest;

export const checkIfScheduleDoesNotExist = async ({
  getService,
  id,
  kibanaSpace,
}: {
  getService: GetAttackDiscoverySchedulesService;
  id: string;
  kibanaSpace?: string;
}) => {
  const supertest = getService('supertest');
  const apisSuperuser = getAttackDiscoverySchedulesApis({ supertest });
  const result = await apisSuperuser.get({
    id,
    kibanaSpace,
    expectedHttpCode: 404,
  });
  expect(result).toEqual(getScheduleNotFoundError(id));
};
