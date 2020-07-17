/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IValidatedEvent } from '../../../../plugins/event_log/server';
import { getUrlPrefix } from '.';
import { FtrProviderContext } from '../ftr_provider_context';

interface GetEventLogParams {
  getService: FtrProviderContext['getService'];
  spaceId: string;
  type: string;
  id: string;
  provider: string;
  actions: string[];
}

// Return event log entries given the specified parameters; for the `actions`
// parameter, at least one event of each action must be in the returned entries.
export async function getEventLog(params: GetEventLogParams): Promise<IValidatedEvent[]> {
  const { getService, spaceId, type, id, provider, actions } = params;
  const supertest = getService('supertest');

  const spacePrefix = getUrlPrefix(spaceId);
  const url = `${spacePrefix}/api/event_log/${type}/${id}/_find`;

  const { body: result } = await supertest.get(url).expect(200);
  if (!result.total) {
    throw new Error('no events found yet');
  }

  const events: IValidatedEvent[] = (result.data as IValidatedEvent[]).filter(
    (event) => event?.event?.provider === provider
  );
  const foundActions = new Set(
    events.map((event) => event?.event?.action).filter((event) => !!event)
  );

  for (const action of actions) {
    if (!foundActions.has(action)) {
      throw new Error(`no event found with action "${action}"`);
    }
  }

  return events;
}
