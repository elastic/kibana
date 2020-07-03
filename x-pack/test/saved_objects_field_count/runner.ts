/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CiStatsReporter } from '@kbn/dev-utils';
// @ts-ignore not TS yet
import getUrl from '../../../src/test_utils/get_url';

import { FtrProviderContext } from './../functional/ftr_provider_context';

export async function testRunner({ getService }: FtrProviderContext) {
  const log = getService('log');
  const es = getService('es');

  const reporter = CiStatsReporter.fromEnv(log);

  const { body: fields } = await es.fieldCaps({
    index: '.kibana',
    fields: '*',
  });
  const fieldCount = Object.keys(fields).length;
  log.debug('Saved Objects field count');
  await reporter.metrics([{ group: 'Saved Objects field count', id: 'total', value: fieldCount }]);
}
