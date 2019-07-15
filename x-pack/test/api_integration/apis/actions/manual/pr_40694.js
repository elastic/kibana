#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const fetch = require('node-fetch');

const KBN_URLBASE = process.env.KBN_URLBASE || 'http://elastic:changeme@localhost:5601';

if (require.main === module) main();

async function main() {
  let response;

  response = await httpPost('api/action', {
    attributes: {
      actionTypeId: '.email',
      description: 'an email action',
      actionTypeConfig: {
        user: 'elastic',
        password: 'changeme',
        from: 'patrick.mueller@elastic.co',
        host: 'localhost',
        port: 80,
        secure: false,
      }
    }
  });
  console.log(`result of create: ${JSON.stringify(response, null, 4)}`);

  const actionId = response.id;

  response = await httpGet(`api/action/${actionId}`);
  console.log(`action after create: ${JSON.stringify(response, null, 4)}`);

  response = await httpPut(`api/action/${actionId}`, {
    attributes: {
      description: 'an email action',
      actionTypeConfig: {
        user: 'elastic',
        password: 'changeme',
        from: 'patrick.mueller@elastic.co',
        service: '__json',
      }
    }
  });

  console.log(`response from update: ${JSON.stringify(response, null, 4)}`);

  response = await httpGet(`api/action/${actionId}`);
  console.log(`action after update: ${JSON.stringify(response, null, 4)}`);

  response = await httpPost(`api/action/${actionId}/_fire`, {
    params: {
      to: ['patrick.mueller@elastic.co'],
      subject: 'the email subject',
      message: 'the email message'
    }
  });

  console.log(`fire result: ${JSON.stringify(response, null, 4)}`);
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
      'kbn-xsrf': 'what-evs'
    }
  });

  return response.json();
}

async function httpPut(uri, body) {
  const response = await fetch(`${KBN_URLBASE}/${uri}`, {
    method: 'put',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'kbn-xsrf': 'what-evs'
    }
  });

  return response.json();
}
