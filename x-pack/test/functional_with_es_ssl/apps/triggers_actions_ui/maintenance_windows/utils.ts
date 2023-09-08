/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObjectRemover } from '../../../lib/object_remover';
import { FtrProviderContext } from '../../../ftr_provider_context';

export const createObjectRemover = async ({
  getService,
}: {
  getService: FtrProviderContext['getService'];
}) => {
  const supertest = getService('supertest');
  const objectRemover = new ObjectRemover(supertest);

  return objectRemover;
};

export const createMaintenanceWindow = async ({
  name,
  startDate,
  notRecurring,
  getService,
}: {
  name: string;
  startDate?: Date;
  notRecurring?: boolean;
  getService: FtrProviderContext['getService'];
}) => {
  const supertest = getService('supertest');
  const dtstart = startDate ? startDate : new Date();
  const createParams = {
    title: name,
    duration: 60 * 60 * 1000,
    r_rule: {
      dtstart: dtstart.toISOString(),
      tzid: 'UTC',
      ...(notRecurring ? { freq: 1, count: 1 } : { freq: 2 }),
    },
  };

  const { body } = await supertest
    .post(`/internal/alerting/rules/maintenance_window`)
    .set('kbn-xsrf', 'foo')
    .send(createParams)
    .expect(200);

  return body;
};
