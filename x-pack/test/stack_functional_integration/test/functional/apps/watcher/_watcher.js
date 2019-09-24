
import expect from 'expect.js';

import {
  bdd,
  esClient
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('watcher app', function describeIndexTests() {


  bdd.describe('simple watch', function () {
    const watchId = 'cluster_health_watch_' + new Date().getTime();
    const kbnInternVars = global.__kibana__intern__;
    const config = kbnInternVars.intern.config;

    bdd.it('should successfully add a new watch for cluster health yellow', function () {
      console.log('config.servers.elasticsearch.protocol = ' + config.servers.elasticsearch.protocol);
      const clusterHealthWatch = {
        "trigger" : {
          "schedule" : { "interval" : "10s" }
        },
        "input" : {
          "http" : {
            "request" : {
              "host" : config.servers.elasticsearch.hostname,
              "port" : config.servers.elasticsearch.port,
              "scheme": config.servers.elasticsearch.protocol,
              "path" : "/_cluster/health",
              "scheme" : config.servers.elasticsearch.protocol,
              "auth" : {
                "basic" : {
                  "username" : config.servers.elasticsearch.username,
                  "password" : config.servers.elasticsearch.password
                }
              }
            }
          }
        },
        "condition" : {
          "compare" : {
            "ctx.payload.status" : { "eq" : "yellow" }
          }
        },
        "actions" : {
          "log" : {
            "logging" : {
              "text" : "executed at {{ctx.execution_time}}"
            }
          }
        }
      };
      PageObjects.common.debug(clusterHealthWatch);
      return esClient.putWatch(watchId, clusterHealthWatch)
      .then((response) => {
        PageObjects.common.debug(response);
        expect(response.body._id).to.eql(watchId);
        expect(response.statusCode).to.eql('201');
        expect(response.body._version).to.eql('1');
      });
    });


    bdd.it('should be successful and update revision', function () {
      return PageObjects.common.sleep(9000)
      .then(() => {
        return PageObjects.common.try(() => {
          return esClient.search('.watcher-history*', 'watch_id:' + watchId)
          .then((response) => {
            PageObjects.common.debug('\n.watcher-history*=' + JSON.stringify(response) + '\n');
          })
        .then(() => {
          return esClient.get('.watches', '_doc', watchId);
        })
          .then((response) => {
            PageObjects.common.debug('\nresponse=' + JSON.stringify(response) + '\n');
            expect(response.body._id).to.eql(watchId);
            expect(response.body.found).to.eql(true);
            expect(response.body._source.status.actions.log.last_execution.successful).to.eql(true);
          });
        });
      });
    });


  });
});
