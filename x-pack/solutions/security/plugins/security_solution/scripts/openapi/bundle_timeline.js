/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('@kbn/setup-node-env');
const { bundle } = require('@kbn/openapi-bundler');
const { REPO_ROOT } = require('@kbn/repo-info');
const { join, resolve } = require('path');

const ROOT = resolve(__dirname, '../..');
const SECURITYSOLUTION_API_ROOT = join(
  REPO_ROOT,
  'src/platform/packages/shared/kbn-securitysolution-api'
);

(async () => {
  await bundle({
    sourceGlob: join(SECURITYSOLUTION_API_ROOT, 'api/timeline/**/*.schema.yaml'),
    outputFilePath: join(
      ROOT,
      'docs/openapi/serverless/security_solution_timeline_api_{version}.bundled.schema.yaml'
    ),
    options: {
      includeLabels: ['serverless'],
      prototypeDocument: {
        info: {
          title: 'Security Timeline API (Elastic Cloud Serverless)',
          description:
            'You can create Timelines and Timeline templates via the API, as well as import new Timelines from an ndjson file.',
        },
        tags: [
          {
            name: 'Security Timeline API',
            'x-displayName': 'Security timeline',
            description:
              'You can create Timelines and Timeline templates via the API, as well as import new Timelines from an ndjson file.',
          },
        ],
      },
    },
  });

  await bundle({
    sourceGlob: join(SECURITYSOLUTION_API_ROOT, 'api/timeline/**/*.schema.yaml'),
    outputFilePath: join(
      ROOT,
      'docs/openapi/ess/security_solution_timeline_api_{version}.bundled.schema.yaml'
    ),
    options: {
      includeLabels: ['ess'],
      prototypeDocument: {
        info: {
          title: 'Security Timeline API (Elastic Cloud and self-hosted)',
          description:
            'You can create Timelines and Timeline templates via the API, as well as import new Timelines from an ndjson file.',
        },
        tags: [
          {
            name: 'Security Timeline API',
            'x-displayName': 'Security timeline',
            description:
              'You can create Timelines and Timeline templates via the API, as well as import new Timelines from an ndjson file.',
          },
        ],
      },
    },
  });
})();
