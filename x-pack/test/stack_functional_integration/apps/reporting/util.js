/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export const pretty = (x) => JSON.stringify(x, null, 2);
export const buildUrl = ({ protocol, auth, hostname, port }) =>
  new URL(`${protocol}://${auth}@${hostname}:${port}`);
export const putWatcher = async (watch, id, body, client, log) => {
  const putWatchResponse = await client.watcher.putWatch({ ...watch, body }, { meta: true });
  log.debug(`# putWatchResponse \n${pretty(putWatchResponse)}`);
  expect(putWatchResponse.body._id).to.eql(id);
  expect(putWatchResponse.statusCode).to.eql('201');
  expect(putWatchResponse.body._version).to.eql('1');
};
export const getWatcher = async (watch, id, client, log, common, tryForTime) => {
  await common.sleep(50000);
  await tryForTime(
    250000,
    async () => {
      await common.sleep(25000);

      await watcherHistory(id, client, log);

      const getWatchResponse = await client.watcher.getWatch(watch, { meta: true });
      log.debug(`\n getWatchResponse: ${JSON.stringify(getWatchResponse)}`);
      expect(getWatchResponse.body._id).to.eql(id);
      expect(getWatchResponse.body._version).to.be.above(1);
      log.debug(`\n getWatchResponse.body._version: ${getWatchResponse.body._version}`);
      expect(getWatchResponse.body.status.execution_state).to.eql('executed');
      expect(getWatchResponse.body.status.actions.email_admin.last_execution.successful).to.eql(
        true
      );

      return getWatchResponse;
    },
    async function onFailure(obj) {
      log.debug(`\n### tryForTime-Failure--raw body: \n\t${pretty(obj)}`);
    }
  );
};
export const deleteWatcher = async (watch, id, client, log) => {
  const deleteResponse = await client.watcher.deleteWatch(watch, { meta: true });
  log.debug('\nDelete Response=' + pretty(deleteResponse) + '\n');
  expect(deleteResponse.body._id).to.eql(id);
  expect(deleteResponse.body.found).to.eql(true);
  expect(deleteResponse.statusCode).to.eql('200');
};
async function watcherHistory(watchId, client, log) {
  const body = await client.search({
    index: '.watcher-history*',
    body: {
      query: {
        bool: {
          filter: [
            {
              bool: {
                should: [
                  {
                    match_phrase: {
                      watchId,
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
    },
  });
  log.debug(`\nwatcherHistoryResponse \n${pretty(body)}\n`);
}
