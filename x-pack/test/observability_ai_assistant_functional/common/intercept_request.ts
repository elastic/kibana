/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WebDriver } from 'selenium-webdriver';

interface ResponseFactory {
  fail: (reason?: string) => ['Fetch.failRequest', { requestId: string }];
}

export async function interceptRequest(
  driver: WebDriver,
  pattern: string,
  onIntercept: (responseFactory: ResponseFactory) => [string, Record<string, any>],
  cb: () => Promise<void>
) {
  const connection = await driver.createCDPConnection('page');

  return new Promise<void>((resolve, reject) => {
    connection._wsConnection.on('message', async (data: Buffer) => {
      const parsed = JSON.parse(data.toString());

      if (parsed.method === 'Fetch.requestPaused') {
        await new Promise((innerResolve) =>
          connection.execute(
            ...onIntercept({
              fail: () => [
                'Fetch.failRequest',
                { requestId: parsed.params.requestId, errorReason: 'Failed' },
              ],
            }),
            innerResolve
          )
        );

        await new Promise((innerResolve) => connection.execute('Fetch.disable', {}, innerResolve));
        resolve();
      }
    });

    new Promise((innerResolve) =>
      connection.execute(
        'Fetch.enable',
        {
          patterns: [{ urlPattern: pattern }],
        },
        innerResolve
      )
    )
      .then(() => {
        return cb();
      })
      .catch((err: Error) => {
        reject(err);
      });
  });
}
