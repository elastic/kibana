import expect from '@kbn/expect';

export const dash = x => x.replace(/\s/gm, '-');
export const pretty = x =>
  JSON.stringify(x, null, 2);
export const buildUrl = ({ protocol, auth, hostname, port }) =>
  new URL(`${protocol}://${auth}@${hostname}:${port}`);
export const putWatcher = async (watch, id, body, client, log) => {
  const putWatchResponse = await client.watcher.putWatch({ ...watch, body });
  log.debug(`# putWatchResponse \n${pretty(putWatchResponse)}`);
  expect(putWatchResponse.body._id).to.eql(id);
  expect(putWatchResponse.statusCode).to.eql('201');
  expect(putWatchResponse.body._version).to.eql('1');
};
export const getWatcher = async (watch, id, client, log, common, tryForTime) => {
  await common.sleep(20000);
  await tryForTime(90000, async () => {
    await common.sleep(15000);

    // *** Prolly gonna drop the following commented out code soon!
    // History search
    // const watcherHistoryResponse = await esClient.watcher.getWatch(watchId);
    // Print history search result
    // log.debug(`\nwatcherHistoryResponse=\n${pretty(watcherHistoryResponse)}\n`);

    const getWatchResponse = await client.watcher.getWatch(watch);
    expect(getWatchResponse.body._id).to.eql(id);
    expect(getWatchResponse.body._version).to.be.above(1);
    log.debug(`\n getWatchResponse.body._version: ${getWatchResponse.body._version}`);
    expect(getWatchResponse.body.status.execution_state).to.eql('executed');
    expect(getWatchResponse.body.status.actions.email_admin.last_execution.successful).to.eql(true);

    return  getWatchResponse;
  }, async function onFailure(obj) {
    log.debug(`\n### tryForTime-Failure--raw body: \n\t${pretty(obj)}`);
  });
};
export const deleteWatcher = async (watch, id, client, log) => {
  const deleteResponse = await client.watcher.deleteWatch(watch);
  log.debug('\nDelete Response=' + pretty(deleteResponse) + '\n');
  expect(deleteResponse.body._id).to.eql(id);
  expect(deleteResponse.body.found).to.eql(true);
  expect(deleteResponse.statusCode).to.eql('200');
};
