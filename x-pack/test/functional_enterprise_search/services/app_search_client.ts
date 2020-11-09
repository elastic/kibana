/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import http from 'http';

/**
 * A simple request client for making API calls to the App Search API
 */
const makeRequest = <T>(method: string, path: string, body?: object): Promise<T> => {
  return new Promise(function (resolve, reject) {
    const APP_SEARCH_API_KEY = process.env.APP_SEARCH_API_KEY;

    if (!APP_SEARCH_API_KEY) {
      throw new Error('Please provide a valid APP_SEARCH_API_KEY. See README for more details.');
    }

    let postData;

    if (body) {
      postData = JSON.stringify(body);
    }

    const req = http.request(
      {
        method,
        hostname: 'localhost',
        port: 3002,
        path,
        agent: false, // Create a new agent just for this one request
        headers: {
          Authorization: `Bearer ${APP_SEARCH_API_KEY}`,
          'Content-Type': 'application/json',
          ...(!!postData && { 'Content-Length': Buffer.byteLength(postData) }),
        },
      },
      (res) => {
        const bodyChunks: Uint8Array[] = [];
        res.on('data', function (chunk) {
          bodyChunks.push(chunk);
        });

        res.on('end', function () {
          let responseBody;
          try {
            responseBody = JSON.parse(Buffer.concat(bodyChunks).toString());
          } catch (e) {
            reject(e);
          }

          if (res.statusCode && res.statusCode > 299) {
            reject('Error calling App Search API: ' + JSON.stringify(responseBody));
          }

          resolve(responseBody);
        });
      }
    );

    req.on('error', (e) => {
      reject(e);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
};

export interface IEngine {
  name: string;
}

export const createEngine = async (engineName: string): Promise<IEngine> => {
  return await makeRequest('POST', '/api/as/v1/engines', { name: engineName });
};

export const destroyEngine = async (engineName: string): Promise<object> => {
  return await makeRequest('DELETE', `/api/as/v1/engines/${engineName}`);
};

export const createMetaEngine = async (
  engineName: string,
  sourceEngines: string[]
): Promise<IEngine> => {
  return await makeRequest('POST', '/api/as/v1/engines', {
    name: engineName,
    type: 'meta',
    source_engines: sourceEngines,
  });
};

export interface ISearchResponse {
  results: object[];
}

const search = async (engineName: string): Promise<ISearchResponse> => {
  return await makeRequest('POST', `/api/as/v1/engines/${engineName}/search`, { query: '' });
};

// Since the App Search API does not issue document receipts, the only way to tell whether or not documents
// are fully indexed is to poll the search endpoint.
export const waitForIndexedDocs = (engineName: string) => {
  return new Promise(async function (resolve) {
    let isReady = false;
    while (!isReady) {
      const response = await search(engineName);
      if (response.results && response.results.length > 0) {
        isReady = true;
        resolve();
      }
    }
  });
};

export const indexData = async (engineName: string, docs: object[]) => {
  return await makeRequest('POST', `/api/as/v1/engines/${engineName}/documents`, docs);
};
