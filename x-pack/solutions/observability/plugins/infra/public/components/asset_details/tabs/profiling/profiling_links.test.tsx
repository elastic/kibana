/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { FlamegraphLocator } from '@kbn/observability-shared-plugin/common';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { ProfilingLinks } from './profiling_links';

describe('ProfilingLinks', () => {
  it('links to the Profiling app with the host and the selected schema', () => {
    const getRedirectUrl = jest.fn().mockReturnValue('/app/profiling/flamegraphs/flamegraph');

    render(
      <ProfilingLinks
        hostname="host-1"
        from="now-15m"
        to="now"
        profilingLinkLocator={{ getRedirectUrl } as unknown as FlamegraphLocator}
        profilingLinkLabel="Go to Universal Profiling Flamegraph"
        schema={ProfilingSchema.OTEL}
      />
    );

    expect(getRedirectUrl).toHaveBeenCalledWith({
      kuery: 'host.name:"host-1"',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      schema: ProfilingSchema.OTEL,
    });
  });
});
