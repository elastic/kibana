/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Rule } from '@kbn/alerting-plugin/common';
import { GetService } from '../../types';
import { getAlertsTargetIndices } from './get_alerts_target_indices';
import { BULK_INDEX_DELAY, MAX_POLLS } from '../../constants';
import { getSpaceUrlPrefix } from '../authentication/spaces';
import { User } from '../authentication/types';

export async function waitUntilNextExecution(
  getService: GetService,
  user: User,
  alert: Rule,
  spaceId: string,
  intervalInSeconds: number = 1,
  count: number = 0
): Promise<Rule> {
  const supertest = getService('supertestWithoutAuth');
  const es = getService('es');

  await new Promise((resolve) => {
    setTimeout(resolve, intervalInSeconds * 1000);
  });

  const { body, status } = await supertest
    .get(`${getSpaceUrlPrefix(spaceId)}/api/alerts/alert/${alert.id}`)
    .auth(user.username, user.password)
    .set('kbn-xsrf', 'foo');

  const { body: targetIndices, status: targetIndicesStatus } = await getAlertsTargetIndices(
    getService,
    user,
    spaceId
  );
  if (targetIndices.length === 0) {
    const error = new Error('Error getting target indices');
    Object.assign(error, { response: { body: targetIndices, status: targetIndicesStatus } });
    throw error;
  }

  if (status >= 300) {
    const error = new Error('Error getting alert');
    Object.assign(error, { response: { body, status } });
    throw error;
  }

  const nextAlert = body as Rule;

  if (nextAlert.executionStatus.lastExecutionDate !== alert.executionStatus.lastExecutionDate) {
    await new Promise((resolve) => {
      setTimeout(resolve, BULK_INDEX_DELAY);
    });

    /**
     * When calling refresh on an index pattern .alerts-observability.apm.alerts* (as was originally the hard-coded string in this test)
     * The response from Elasticsearch is a 200, even if no indices which match that index pattern have been created.
     * When calling refresh on a concrete index alias .alerts-observability.apm.alerts-default for instance,
     * we receive a 404 error index_not_found_exception when no indices have been created which match that alias (obviously).
     * Since we are receiving a concrete index alias from the observability api instead of a kibana index pattern
     * and we understand / expect that this index does not exist at certain points of the test, we can try-catch at certain points without caring if the call fails.
     * There are points in the code where we do want to ensure we get the appropriate error message back
     */
    try {
      await es.indices.refresh({
        index: targetIndices[0],
      });
      // eslint-disable-next-line no-empty
    } catch (exc) {}
    return nextAlert;
  }

  if (count >= MAX_POLLS) {
    throw new Error('Maximum number of polls exceeded');
  }

  return waitUntilNextExecution(getService, user, alert, spaceId, intervalInSeconds, count + 1);
}
