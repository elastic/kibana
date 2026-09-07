/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';
import {
  getIndexPattern,
  getSessionViewLazy,
  DEFAULT_INDEX,
  CLOUD_DEFEND_INDEX,
  ENDPOINT_INDEX,
  AUDITBEAT_INDEX,
} from '.';
import { createAppRootMockRenderer } from '../test';

const ENDPOINT_EVENT_INDEX = '.ds-logs-endpoint.events.process-default';
const CLOUD_DEFEND_EVENT_INDEX = '.ds-logs-cloud_defend.process-default';
const AUDITBEAT_EVENT_INDEX = '.ds-auditbeat-8-14-0-default';
const TEST_CLUSTER = 'aws';
const CROSS_PROJECT_TEST_SUBJ = '[data-test-subj="sessionView:crossProjectUnsupported"]';

describe('getIndexPattern', () => {
  it('gets endpoint index pattern for events from endpoint', () => {
    expect(getIndexPattern(ENDPOINT_EVENT_INDEX)).toEqual(ENDPOINT_INDEX);
  });

  it('gets cloud_defend index pattern for events from cloud-defend', () => {
    expect(getIndexPattern(CLOUD_DEFEND_EVENT_INDEX)).toEqual(CLOUD_DEFEND_INDEX);
  });

  it('gets auditbeat index pattern for events from auditbeat events ', () => {
    expect(getIndexPattern(AUDITBEAT_EVENT_INDEX)).toEqual(AUDITBEAT_INDEX);
  });

  it('gets logs-* for everything else', () => {
    expect(getIndexPattern('asdfasdfasdf')).toEqual(DEFAULT_INDEX);
  });

  it('preserves the cluster portion of the endpoint event index', () => {
    expect(getIndexPattern(TEST_CLUSTER + ':' + ENDPOINT_EVENT_INDEX)).toEqual(
      TEST_CLUSTER + ':' + ENDPOINT_INDEX
    );
  });
});

describe('getSessionViewLazy', () => {
  const baseProps = {
    sessionEntityId: 'test-entity-id',
    sessionStartTime: '2021-11-23T15:14:21.000Z',
    openDetails: jest.fn(),
    closeDetails: jest.fn(),
  };

  it('renders the cross-project unsupported prompt when the session lives in a linked project', () => {
    const { render } = createAppRootMockRenderer();
    const { container, unmount } = render(
      getSessionViewLazy({ ...baseProps, index: `${TEST_CLUSTER}:${ENDPOINT_EVENT_INDEX}` })
    );

    expect(container.querySelector(CROSS_PROJECT_TEST_SUBJ)).not.toBeNull();
    unmount();
  });

  it('does not render the unsupported prompt for a local (origin) session index', async () => {
    const { render } = createAppRootMockRenderer();
    const { container, unmount } = render(
      getSessionViewLazy({ ...baseProps, index: ENDPOINT_EVENT_INDEX })
    );

    expect(container.querySelector(CROSS_PROJECT_TEST_SUBJ)).toBeNull();
    // flush the lazily-imported SessionView so its Suspense resolution is wrapped in act()
    await act(async () => {});
    unmount();
  });
});
