/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProfilingSchema } from '@kbn/profiling-utils';
import { FlamegraphLocatorDefinition } from './flamegraph_locator';
import { StacktracesLocatorDefinition } from './stacktraces_locator';
import { TopNFunctionsLocatorDefinition } from './topn_functions_locator';

describe('Profiling locators', () => {
  const params = { rangeFrom: 'now-15m', rangeTo: 'now', kuery: 'host.name:"host-1"' };

  describe.each([
    ['flamegraph', new FlamegraphLocatorDefinition(), '/flamegraphs/flamegraph'],
    ['TopN functions', new TopNFunctionsLocatorDefinition(), '/functions/topn'],
    ['stacktraces', new StacktracesLocatorDefinition(), '/stacktraces/threads'],
  ])('%s locator', (_name, locator, pathname) => {
    it('links to the given schema', async () => {
      const { path } = await locator.getLocation({ ...params, schema: ProfilingSchema.OTEL });

      expect(path).toBe(
        `${pathname}?kuery=host.name%3A%22host-1%22&rangeFrom=now-15m&rangeTo=now&schema=otel`
      );
    });

    it('omits schema when none is given', async () => {
      const { path } = await locator.getLocation(params);

      expect(path).toBe(`${pathname}?kuery=host.name%3A%22host-1%22&rangeFrom=now-15m&rangeTo=now`);
    });
  });
});
