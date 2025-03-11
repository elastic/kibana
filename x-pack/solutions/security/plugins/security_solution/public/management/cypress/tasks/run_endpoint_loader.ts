/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const runEndpointLoaderScript = () => {
  const {
    ELASTICSEARCH_USERNAME,
    ELASTICSEARCH_PASSWORD,
    ELASTICSEARCH_URL,
    KIBANA_URL,
    IS_SERVERLESS,
  } = Cypress.env();

  const ES_URL = new URL(ELASTICSEARCH_URL);
  ES_URL.username = ELASTICSEARCH_USERNAME;
  ES_URL.password = ELASTICSEARCH_PASSWORD;

  const KBN_URL = new URL(KIBANA_URL);
  KBN_URL.username = ELASTICSEARCH_USERNAME;
  KBN_URL.password = ELASTICSEARCH_PASSWORD;

  // FIXME: remove use of cli script and use instead data loaders
  const script =
    `node scripts/endpoint/resolver_generator.js ` +
    `--node="${ES_URL.toString()}" ` +
    `--kibana="${KBN_URL.toString()}" ` +
    `--delete ` +
    `--numHosts=1 ` +
    `--numDocs=1 ` +
    `--fleet ` +
    `--withNewUser=santaEndpoint:changeme ` +
    `--anc=1 ` +
    `--gen=1 ` +
    `--ch=1 ` +
    `--related=1 ` +
    `--relAlerts=1 ` +
    `--ssl=${IS_SERVERLESS}`;

  cy.exec(script, { env: { NODE_TLS_REJECT_UNAUTHORIZED: 1 }, timeout: 180000 });
};
