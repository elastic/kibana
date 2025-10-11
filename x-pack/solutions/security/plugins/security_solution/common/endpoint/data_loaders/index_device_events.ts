/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { usageTracker } from './usage_tracker';
import type { EndpointDocGenerator, Event, TreeOptions } from '../generate_data';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const indexDeviceEvents = usageTracker.track(
  'indexDeviceEvents',
  async ({
    client,
    deviceIndex,
    generator,
    numDeviceEvents,
    options = {},
  }: {
    client: Client;
    deviceIndex: string;
    generator: EndpointDocGenerator;
    numDeviceEvents: number;
    options: TreeOptions;
  }) => {
    const deviceEventsGenerator = generator.deviceEventsGenerator(
      numDeviceEvents,
      options.eventsDataStream
    );

    let result = deviceEventsGenerator.next();
    const deviceEventDocs: Event[] = [];

    while (!result.done) {
      deviceEventDocs.push(result.value);
      result = deviceEventsGenerator.next();
    }

    if (deviceEventDocs.length > 0) {
      const body = deviceEventDocs.flatMap((doc) => [{ create: { _index: deviceIndex } }, doc]);

      await client.bulk({ body, refresh: 'wait_for' });
    }

    await client.indices.refresh({
      index: deviceIndex,
    });

    await delay(5000);
  }
);
