/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftSource } from '@kbn/nightshift-shared';
import { SignificantEventsWorkflowStatus } from '@kbn/significant-events-schema';
import {
  RUN_SOURCE_ONBOARDING_BUTTON_LABEL,
  RUN_SOURCE_ONBOARDING_CROSS_PROJECT_TOOLTIP,
} from './translations';
import { filterSourcesByQuery, getOnboardSourceTooltip, isOnboardingInProgress } from './utils';

const source = (overrides: Partial<NightshiftSource> = {}): NightshiftSource => ({
  id: 'source-1',
  title: 'Nginx errors',
  tags: ['web'],
  esql: 'FROM logs-nginx-*',
  type: 'logs',
  slug: 'nginx-errors',
  view_name: '$.nightshift.sources.default.nginx-errors',
  enabled: true,
  created_by: 'marco',
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
  esql_updated_at: '2026-09-01T00:00:00.000Z',
  ...overrides,
});

describe('isOnboardingInProgress', () => {
  it('is false when the source has no status yet', () => {
    expect(isOnboardingInProgress(undefined)).toBe(false);
  });

  it('is true only while a run is going or being canceled', () => {
    expect(isOnboardingInProgress(SignificantEventsWorkflowStatus.InProgress)).toBe(true);
    expect(isOnboardingInProgress(SignificantEventsWorkflowStatus.BeingCanceled)).toBe(true);
    expect(isOnboardingInProgress(SignificantEventsWorkflowStatus.NotStarted)).toBe(false);
    expect(isOnboardingInProgress(SignificantEventsWorkflowStatus.Completed)).toBe(false);
    expect(isOnboardingInProgress(SignificantEventsWorkflowStatus.Failed)).toBe(false);
    expect(isOnboardingInProgress(SignificantEventsWorkflowStatus.Canceled)).toBe(false);
  });
});

describe('filterSourcesByQuery', () => {
  const sources = [
    source(),
    source({
      id: 'source-2',
      title: 'Apache access',
      tags: ['proxy'],
      esql: 'FROM logs-apache-*',
    }),
  ];

  it('returns the same list when the query is empty', () => {
    expect(filterSourcesByQuery(sources, '')).toBe(sources);
  });

  it('matches title, query text, or a tag, ignoring case', () => {
    expect(filterSourcesByQuery(sources, 'NGINX').map(({ id }) => id)).toEqual(['source-1']);
    expect(filterSourcesByQuery(sources, 'logs-apache').map(({ id }) => id)).toEqual(['source-2']);
    expect(filterSourcesByQuery(sources, 'WEB').map(({ id }) => id)).toEqual(['source-1']);
  });

  it('returns nothing when nothing matches', () => {
    expect(filterSourcesByQuery(sources, 'syslog')).toEqual([]);
  });
});

describe('getOnboardSourceTooltip', () => {
  it('lets an activity block win over the cross-project disclosure', () => {
    expect(
      getOnboardSourceTooltip({
        activityBlockTooltip: 'Activity is paused',
        isCpsMultiProject: true,
      })
    ).toBe('Activity is paused');
  });

  it('uses the cross-project disclosure once projects are linked', () => {
    expect(
      getOnboardSourceTooltip({ activityBlockTooltip: undefined, isCpsMultiProject: true })
    ).toBe(RUN_SOURCE_ONBOARDING_CROSS_PROJECT_TOOLTIP);
  });

  it('uses the plain label when activity is clear and search stays in one project', () => {
    expect(
      getOnboardSourceTooltip({ activityBlockTooltip: undefined, isCpsMultiProject: false })
    ).toBe(RUN_SOURCE_ONBOARDING_BUTTON_LABEL);
    expect(
      getOnboardSourceTooltip({ activityBlockTooltip: undefined, isCpsMultiProject: undefined })
    ).toBe(RUN_SOURCE_ONBOARDING_BUTTON_LABEL);
  });
});
