/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { get } from 'lodash';
import * as esMetrics from '../../../../../legacy/plugins/monitoring/server/lib/metrics/elasticsearch/metrics';
import * as kibanaMetrics from '../../../../../legacy/plugins/monitoring/server/lib/metrics/kibana/metrics';
import * as logstashMetrics from '../../../../../legacy/plugins/monitoring/server/lib/metrics/logstash/metrics';
import * as beatsMetrics from '../../../../../legacy/plugins/monitoring/server/lib/metrics/beats/metrics';
import * as apmMetrics from '../../../../../legacy/plugins/monitoring/server/lib/metrics/apm/metrics';

export default function({ getService }) {
  const es = getService('legacyEs');

  const metricSets = [
    {
      metrics: esMetrics.metrics,
      name: 'es metrics',
      indexTemplate: '.monitoring-es',
    },
    {
      metrics: kibanaMetrics.metrics,
      name: 'kibana metrics',
      indexTemplate: '.monitoring-kibana',
    },
    {
      metrics: logstashMetrics.metrics,
      name: 'logstash metrics',
      indexTemplate: '.monitoring-logstash',
    },
    {
      metrics: beatsMetrics.metrics,
      name: 'beats metrics',
      indexTemplate: '.monitoring-beats',
    },
    {
      metrics: apmMetrics.metrics,
      name: 'apm metrics',
      indexTemplate: '.monitoring-beats', // apm uses the same as beats
    },
  ];

  describe('mappings', () => {
    for (const { indexTemplate, metrics, name } of metricSets) {
      let mappings;

      before('load mappings', async () => {
        const template = await es.indices.getTemplate({ name: indexTemplate });
        mappings = get(template, [indexTemplate, 'mappings', 'properties']);
      });

      describe(`for ${name}`, () => {
        // eslint-disable-line no-loop-func
        for (const metric of Object.values(metrics)) {
          for (const field of metric.getFields()) {
            it(`${field} should exist in the mappings`, () => {
              // eslint-disable-line no-loop-func
              const propertyGetter = field
                .split('.')
                .reduce((list, field) => {
                  list.push(field);
                  list.push('properties');
                  return list;
                }, [])
                .slice(0, -1); // Remove the trailing 'properties'

              const foundMapping = get(mappings, propertyGetter, null);
              expect(foundMapping).to.not.equal(null);
            });
          }
        }
      });
    }
  });
}
