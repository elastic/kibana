/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CiStatsReporter } from '@kbn/dev-utils';
// @ts-ignore not TS yet
import getUrl from '../../../src/test_utils/get_url';

import { FtrProviderContext } from './../functional/ftr_provider_context';

const IGNORED_FIELDS = [
  // The following fields are returned by the _field_caps API but aren't counted
  // towards the index field limit.
  '_seq_no',
  '_id',
  '_version',
  '_field_names',
  '_ignored',
  '_feature',
  '_index',
  '_routing',
  '_source',
  '_type',
  '_nested_path',
  '_timestamp',
  // migrationVersion is dynamic so will be anywhere between 1..type count
  // depending on which objects are present in the index when querying the
  // field caps API. See https://github.com/elastic/kibana/issues/70815
  'migrationVersion',
];

export async function testRunner({ getService }: FtrProviderContext) {
  const log = getService('log');
  const es = getService('es');

  const reporter = CiStatsReporter.fromEnv(log);

  log.debug('Saved Objects field count');

  const {
    body: { fields },
  } = await es.fieldCaps({
    index: '.kibana',
    fields: '*',
  });

  const fieldCountPerTypeMap: Map<string, number> = Object.keys(fields)
    .map((f) => f.split('.')[0])
    .filter((f) => !IGNORED_FIELDS.includes(f))
    .reduce((accumulator, f) => {
      accumulator.set(f, accumulator.get(f) + 1 || 1);
      return accumulator;
    }, new Map());

  const fieldCountPerType = Array.from(fieldCountPerTypeMap.entries());

  const fieldCountTotal = fieldCountPerType.reduce((acc, [type, count]) => acc + count, 0);
  await reporter.metrics([
    { group: 'Saved Objects field count', id: 'total', value: fieldCountTotal },
  ]);

  await Promise.all(
    fieldCountPerType
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([fieldType, count]) => {
        return reporter.metrics([
          { group: 'Saved Objects field count', id: fieldType, value: count },
        ]);
      })
  );
}
