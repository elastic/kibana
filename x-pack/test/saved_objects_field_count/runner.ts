/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CiStatsReporter } from '@kbn/dev-utils';
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

  log.debug('Saved Objects field count metrics starting');

  const { fields } = await es.fieldCaps({
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

  const metrics = Array.from(fieldCountPerTypeMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([fieldType, count]) => ({
      group: 'Saved Objects .kibana field count',
      id: fieldType,
      value: count,
    }));

  log.debug(
    'Saved Objects field count metrics:\n',
    metrics.map(({ id, value }) => `${id}:${value}`).join('\n')
  );
  await reporter.metrics(metrics);
  log.debug('Saved Objects field count metrics done');
}
