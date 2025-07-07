/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('../../../../../../src/setup_node_env');
// eslint-disable-next-line import/no-nodejs-modules
const { join, resolve } = require('path');
const { bundle } = require('@kbn/openapi-bundler');

const ROOT = resolve(__dirname, '..');

(async () => {
  await bundle({
    sourceGlob: join(ROOT, 'api/**/*.schema.yaml'),
    outputFilePath: join(
      ROOT,
      'docs/openapi/serverless/security_solution_endpoint_exceptions_api_{version}.bundled.schema.yaml'
    ),
    options: {
      includeLabels: ['serverless'],
      prototypeDocument: {
        info: {
          title: 'Security Endpoint Exceptions API (Elastic Cloud Serverless)',
          description: 'Endpoint Exceptions API allow you to manage Endpoint lists.',
        },
        tags: [
          {
            name: 'Security Endpoint Exceptions API',
            'x-displayName': 'Security Elastic Endpoint exceptions',
            description:
              "Endpoint Exceptions API allows you to manage detection rule endpoint exceptions to prevent a rule from generating an alert from incoming events even when the rule's other criteria are met.",
          },
        ],
      },
    },
  });

  await bundle({
    sourceGlob: join(ROOT, 'api/**/*.schema.yaml'),
    outputFilePath: join(
      ROOT,
      'docs/openapi/ess/security_solution_endpoint_exceptions_api_{version}.bundled.schema.yaml'
    ),
    options: {
      includeLabels: ['ess'],
      prototypeDocument: {
        info: {
          title: 'Security Endpoint Exceptions API (Elastic Cloud and self-hosted)',
          description: 'Endpoint Exceptions API allow you to manage Endpoint lists.',
        },
        tags: [
          {
            name: 'Security Endpoint Exceptions API',
            'x-displayName': 'Security Elastic Endpoint exceptions',
            description:
              "Endpoint Exceptions API allows you to manage detection rule endpoint exceptions to prevent a rule from generating an alert from incoming events even when the rule's other criteria are met.",
          },
        ],
      },
    },
  });
})();
