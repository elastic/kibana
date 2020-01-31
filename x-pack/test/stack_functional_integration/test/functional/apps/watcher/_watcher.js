/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Client } from '@elastic/elasticsearch';
import { buildUrl } from '../reporting/util';

export default function({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['common', 'discover', 'header']);
  const log = getService('log');
  const retry = getService('retry');
  const config = getService('config');
  const servers = config.get('servers');
  describe('watcher app', function describeIndexTests() {
    let esClient;

    before(async () => {
      esClient = new Client({
        node: buildUrl(servers.elasticsearch).toString(),
      });
    });

    describe('simple watch', function() {
      const watchId = 'cluster_health_watch_' + new Date().getTime();

      it('should successfully add a new watch for cluster health yellow', function() {
        log.debug(
          '### config.servers.elasticsearch.protocol = ' + config.servers.elasticsearch.protocol
        );
        const clusterHealthWatch = {
          trigger: {
            schedule: { interval: '10s' },
          },
          input: {
            http: {
              request: {
                host: config.servers.elasticsearch.hostname,
                port: config.servers.elasticsearch.port,
                scheme: config.servers.elasticsearch.protocol,
                path: '/_cluster/health',
                auth: {
                  basic: {
                    username: config.servers.elasticsearch.username,
                    password: config.servers.elasticsearch.password,
                  },
                },
              },
            },
          },
          condition: {
            compare: {
              'ctx.payload.status': { eq: 'yellow' },
            },
          },
          actions: {
            log: {
              logging: {
                text: 'executed at {{ctx.execution_time}}',
              },
            },
          },
        };
        log.debug(clusterHealthWatch);
        return esClient.putWatch(watchId, clusterHealthWatch).then(response => {
          log.debug(response);
          expect(response.body._id).to.eql(watchId);
          expect(response.statusCode).to.eql('201');
          expect(response.body._version).to.eql('1');
        });
      });

      it('should be successful and update revision', function() {
        return PageObjects.common.sleep(9000).then(() => {
          return retry.try(() => {
            return esClient
              .search('.watcher-history*', 'watch_id:' + watchId)
              .then(response => {
                log.debug('\n.watcher-history*=' + JSON.stringify(response) + '\n');
              })
              .then(() => {
                return esClient.get('.watches', '_doc', watchId);
              })
              .then(response => {
                log.debug('\nresponse=' + JSON.stringify(response) + '\n');
                expect(response.body._id).to.eql(watchId);
                expect(response.body.found).to.eql(true);
                expect(response.body._source.status.actions.log.last_execution.successful).to.eql(
                  true
                );
              });
          });
        });
      });
    });
  });
}
