/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('@kbn/babel-register').install();
const { retrieveConnectorConfig, retrieveLangsmithKey } = require('./manage_secrets');

async function retrieveConfigs() {
  await retrieveConnectorConfig();
  await retrieveLangsmithKey();
}

retrieveConfigs();
