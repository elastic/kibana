/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { format as formatUrl } from 'url';

import { REPO_ROOT } from '@kbn/repo-info';
import {
  esTestConfig,
  kbnTestConfig,
  kibanaServiceAccount,
  kibanaServerlessSuperuser,
} from '@kbn/test';
import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';

export default async () => {
  const servers = {
    kibana: kbnTestConfig.getUrlParts(kibanaServerlessSuperuser),
    elasticsearch: esTestConfig.getUrlParts(),
  };

  return {
    servers,

    esTestCluster: {
      from: 'serverless',
      serverArgs: [
        // HTTP SSL requires setup for Kibana to trust ESS certs, disable for now
        'xpack.security.http.ssl.enabled=false',
      ],
    },

    kbnTestServer: {
      buildArgs: [],
      env: {
        KBN_PATH_CONF: resolve(REPO_ROOT, 'config'),
      },
      sourceArgs: ['--no-base-path', '--env.name=development'],
      serverArgs: [
        `--server.restrictInternalApis=true`,
        `--server.port=${kbnTestConfig.getPort()}`,
        '--status.allowAnonymous=true',
        // We shouldn't embed credentials into the URL since Kibana requests to Elasticsearch should
        // either include `kibanaServerTestUser` credentials, or credentials provided by the test
        // user, or none at all in case anonymous access is used.
        `--elasticsearch.hosts=${formatUrl(
          Object.fromEntries(
            Object.entries(servers.elasticsearch).filter(([key]) => key.toLowerCase() !== 'auth')
          )
        )}`,
        `--elasticsearch.serviceAccountToken=${kibanaServiceAccount.token}`,
        '--telemetry.sendUsageTo=staging',
        `--logging.appenders.deprecation=${JSON.stringify({
          type: 'console',
          layout: {
            type: 'json',
          },
        })}`,
        `--logging.loggers=${JSON.stringify([
          {
            name: 'elasticsearch.deprecation',
            level: 'all',
            appenders: ['deprecation'],
          },
        ])}`,
        '--xpack.encryptedSavedObjects.encryptionKey="wuGNaIhoMpk5sO4UBxgr3NyW1sFcLgIf"',
        `--server.publicBaseUrl=${servers.kibana.protocol}://${servers.kibana.hostname}:${servers.kibana.port}`,
      ],
    },

    security: { disableTestUser: true },

    // Used by FTR to recognize serverless project and change its behavior accordingly
    serverless: true,

    services: {
      ...commonFunctionalServices,
    },

    // overriding default timeouts from packages/kbn-test/src/functional_test_runner/lib/config/schema.ts
    // so we can easily adjust them for serverless where needed
    timeouts: {
      find: 10 * 1000,
      try: 120 * 1000,
      waitFor: 20 * 1000,
      esRequestTimeout: 30 * 1000,
      kibanaReportCompletion: 60 * 1000,
      kibanaStabilize: 15 * 1000,
      navigateStatusPageCheck: 250,
      waitForExists: 2500,
    },
  };
};
