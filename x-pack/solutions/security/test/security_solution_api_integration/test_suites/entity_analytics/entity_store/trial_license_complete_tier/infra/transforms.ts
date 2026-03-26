/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export async function triggerTransform(providerContext: FtrProviderContext, transformId: string) {
  const es = providerContext.getService('es');

  const { acknowledged } = await es.transform.scheduleNowTransform({
    transform_id: transformId,
  });
  expect(acknowledged).toBe(true);
}
