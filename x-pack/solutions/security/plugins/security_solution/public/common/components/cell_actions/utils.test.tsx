/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TableId } from '@kbn/securitysolution-data-table';
import { TimelineId } from '../../../../common/types';
import { ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID } from '../../../timelines/components/row_renderers_browser/constants';
import {
  disableHoverActions,
  tooltipContentIsExplicitlyNull,
  getDefaultWhenTooltipIsUnspecified,
} from './utils';

const scopeIdsWithHoverActions = [
  undefined,
  TimelineId.active,
  TableId.alternateTest,
  TimelineId.casePage,
  TableId.alertsOnAlertsPage,
  TableId.alertsOnAttacksPage,
  TableId.alertsOnRuleDetailsPage,
  TableId.hostsPageEvents,
  TableId.hostsPageSessions,
  TableId.kubernetesPageSessions,
  TableId.networkPageEvents,
  TimelineId.test,
  TableId.usersPageEvents,
];

const scopeIdsNoHoverActions = [TableId.rulePreview, ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID];

describe('disableHoverActions', () => {
  scopeIdsNoHoverActions.forEach((scopeId) =>
    test(`it returns true when timelineId is ${scopeId}`, () => {
      expect(disableHoverActions(scopeId)).toBe(true);
    })
  );

  scopeIdsWithHoverActions.forEach((scopeId) =>
    test(`it returns false when timelineId is ${scopeId}`, () => {
      expect(disableHoverActions(scopeId)).toBe(false);
    })
  );
});

describe('tooltipContentIsExplicitlyNull', () => {
  test('returns false if a string is provided for the tooltip', () => {
    expect(tooltipContentIsExplicitlyNull('bob')).toBe(false);
  });

  test('returns false if the tooltip is undefined', () => {
    expect(tooltipContentIsExplicitlyNull(undefined)).toBe(false);
  });

  test('returns false if the tooltip is a ReactNode', () => {
    expect(tooltipContentIsExplicitlyNull(<span>{'be a good node'}</span>)).toBe(false);
  });

  test('returns true if the tooltip is null', () => {
    expect(tooltipContentIsExplicitlyNull(null)).toBe(true);
  });
});

describe('getDefaultWhenTooltipIsUnspecified', () => {
  test('it returns the field (as as string) when the tooltipContent is undefined', () => {
    expect(getDefaultWhenTooltipIsUnspecified({ field: 'source.bytes' })).toEqual('source.bytes');
  });

  test('it returns the field (as as string) when the tooltipContent is null', () => {
    expect(
      getDefaultWhenTooltipIsUnspecified({ field: 'source.bytes', tooltipContent: null })
    ).toEqual('source.bytes');
  });

  test('it returns the tooltipContent when a string is provided as content', () => {
    expect(
      getDefaultWhenTooltipIsUnspecified({ field: 'source.bytes', tooltipContent: 'a string' })
    ).toEqual('a string');
  });

  test('it returns the tooltipContent when an element is provided as content', () => {
    expect(
      getDefaultWhenTooltipIsUnspecified({
        field: 'source.bytes',
        tooltipContent: <span>{'the universe'}</span>,
      })
    ).toEqual(<span>{'the universe'}</span>);
  });
});
