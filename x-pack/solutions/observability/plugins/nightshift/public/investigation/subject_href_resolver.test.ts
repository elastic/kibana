/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { createNightshiftSubjectHrefResolver } from './subject_href_resolver';

const createResolver = () => {
  const { application } = coreMock.createStart();
  application.getUrlForApp.mockImplementation(
    (appId, { path } = {}) => `/s/space/app/${appId}${path ?? ''}`
  );
  return createNightshiftSubjectHrefResolver(application);
};

describe('createNightshiftSubjectHrefResolver', () => {
  it('opens a significant event in the detections page event flyout', () => {
    expect(createResolver()({ type: 'significant_event', id: 'se 1/2' })).toBe(
      '/s/space/app/nightshift/detections/events?eventId=se+1%2F2'
    );
  });

  it('opens an alert on its Observability alert details page', () => {
    const resolve = createResolver();

    expect(resolve({ type: 'alert', id: 'a/1' })).toBe(
      '/s/space/app/observability-overview/alerts/a%2F1'
    );
    expect(resolve({ type: 'alert', id: 'subject-id', snapshot: { id: 'alert-uuid' } })).toBe(
      '/s/space/app/observability-overview/alerts/alert-uuid'
    );
  });

  it('does not link questions or Slack threads', () => {
    const resolve = createResolver();

    expect(resolve({ type: 'manual', id: 'q-1' })).toBeUndefined();
    expect(resolve({ type: 'slack_thread', id: 't-1' })).toBeUndefined();
  });
});
