/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// / <reference types="cypress" />

import { get } from 'lodash';

import { setupStackServicesUsingCypressConfig } from './common';
import {
  getLatestActionDoc,
  updateActionDoc,
  waitForNewActionDoc,
} from '../../../../scripts/endpoint/common/response_actions';

export const responseActionTasks = (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
): void => {
  const stackServicesPromise = setupStackServicesUsingCypressConfig(config);

  on('task', {
    getLatestActionDoc: async () => {
      const { esClient } = await stackServicesPromise;
      // cypress doesn't like resolved undefined values
      return getLatestActionDoc(esClient).then((doc) => doc || null);
    },

    // previousActionDoc is used to determine when a new action doc is received
    tamperActionDoc: async (previousActionDoc) => {
      const { esClient } = await stackServicesPromise;
      const newActionDoc = await waitForNewActionDoc(esClient, previousActionDoc);

      if (!newActionDoc) {
        throw new Error('no action doc found');
      }

      const signed = get(newActionDoc, '_source.signed');
      if (!signed) {
        throw new Error('no signed data in the action doc');
      }
      const signedDataBuffer = Buffer.from(signed.data, 'base64');
      const signedDataJson = JSON.parse(signedDataBuffer.toString());
      const tamperedData = {
        ...signedDataJson,
        comment: 'tampered data',
      };
      const tamperedDataString = Buffer.from(JSON.stringify(tamperedData), 'utf8').toString(
        'base64'
      );
      const tamperedDoc = {
        signed: {
          ...signed,
          data: tamperedDataString,
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return updateActionDoc(esClient, newActionDoc._id!, tamperedDoc);
    },
  });
};
