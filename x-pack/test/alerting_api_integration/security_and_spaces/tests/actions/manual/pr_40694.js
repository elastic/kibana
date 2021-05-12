#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const fetch = require('node-fetch');

const KBN_URLBASE = process.env.KBN_URLBASE || 'http://elastic:changeme@localhost:5601';

if (require.main === module) main();

async function main() {
  let response;

  response = await httpPost('api/actions/connector', {
    connector_type_id: '.email',
    name: 'an email action',
    config: {
      from: 'patrick.mueller@elastic.co',
      host: 'localhost',
      port: 80,
      secure: false,
    },
    secrets: {
      user: 'elastic',
      password: 'changeme',
    },
  });
  console.log(`result of create: ${JSON.stringify(response, null, 4)}`);

  const connectorId = response.id;

  response = await httpGet(`api/actions/${connectorId}`);
  console.log(`action after create: ${JSON.stringify(response, null, 4)}`);

  response = await httpPut(`api/actions/connector/${connectorId}`, {
    name: 'an email action',
    config: {
      from: 'patrick.mueller@elastic.co',
      service: '__json',
    },
    secrets: {
      user: 'elastic',
      password: 'changeme',
    },
  });

  console.log(`response from update: ${JSON.stringify(response, null, 4)}`);

  response = await httpGet(`api/actions/${connectorId}`);
  console.log(`action after update: ${JSON.stringify(response, null, 4)}`);

  response = await httpPost(`api/actions/connector/${connectorId}/_execute`, {
    params: {
      to: ['patrick.mueller@elastic.co'],
      subject: 'the email subject',
      message: 'the email message',
    },
  });

  console.log(`execute result: ${JSON.stringify(response, null, 4)}`);
}

async function httpGet(uri) {
  const response = await fetch(`${KBN_URLBASE}/${uri}`);
  return response.json();
}

async function httpPost(uri, body) {
  const response = await fetch(`${KBN_URLBASE}/${uri}`, {
    method: 'post',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'kbn-xsrf': 'what-evs',
    },
  });

  return response.json();
}

async function httpPut(uri, body) {
  const response = await fetch(`${KBN_URLBASE}/${uri}`, {
    method: 'put',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'kbn-xsrf': 'what-evs',
    },
  });

  return response.json();
}
