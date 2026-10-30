/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import { useInvestigateAlert } from '@kbn/observability-plugin/public';
import { useInvestigateEpisodeHeaderMenuItems } from './use_investigate_episode_header_menu_items';

jest.mock('@kbn/observability-plugin/public', () => ({ useInvestigateAlert: jest.fn() }));
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: { application: { navigateToUrl: mockNavigateToUrl } } }),
}));

const mockNavigateToUrl = jest.fn();
const mockUseInvestigateAlert = jest.mocked(useInvestigateAlert);
const episode = { 'episode.id': 'v2-episode' } as AlertEpisode;
const handleInvestigate = jest.fn(async () => {});
const markInvestigationViewed = jest.fn();
let investigation: ReturnType<typeof useInvestigateAlert>;

const renderItems = (overrides: Partial<typeof investigation> = {}) => {
  mockUseInvestigateAlert.mockReturnValue({ ...investigation, ...overrides });
  return renderHook(() => useInvestigateEpisodeHeaderMenuItems(episode));
};

beforeEach(() => {
  jest.clearAllMocks();
  investigation = {
    showInvestigateAction: true,
    showInvestigateButton: true,
    showViewInvestigation: false,
    hasInvestigation: false,
    handleInvestigate,
    isInvestigating: false,
    isStarting: false,
    investigateActionLabel: 'Investigate',
    investigateEbtProps: {
      'data-ebt-action': 'startInvestigation',
      'data-ebt-element': 'alertDetailsPageActions',
    },
    viewInvestigationUrl: undefined,
    viewInvestigationActionLabel: 'View investigation',
    viewInvestigationEbtProps: {
      'data-ebt-action': 'viewInvestigation',
      'data-ebt-element': 'alertDetailsPageActions',
    },
    markInvestigationViewed,
  };
});

it('starts a Universal alert investigation from a leading header action', () => {
  const { result } = renderItems();
  expect(mockUseInvestigateAlert).toHaveBeenCalledWith({
    alertId: 'v2-episode',
    ebtElement: 'alertDetailsPageActions',
  });
  expect(result.current).toHaveLength(1);
  expect(result.current[0]).toMatchObject({
    label: 'Investigate',
    iconType: 'inspect',
    order: -1,
    overflow: false,
    ebt: { action: 'startInvestigation' },
  });
  result.current[0].run?.();
  expect(handleInvestigate).toHaveBeenCalledTimes(1);
});

it.each([{ showInvestigateAction: false }, { showInvestigateButton: false }])(
  'hides the button before availability and lookup succeed: %s',
  (overrides) => {
    expect(renderItems(overrides).result.current).toEqual([]);
  }
);

it('hides the button before an alert is loaded', () => {
  mockUseInvestigateAlert.mockReturnValue(investigation);
  const { result } = renderHook(() => useInvestigateEpisodeHeaderMenuItems(undefined));
  expect(result.current).toEqual([]);
  expect(mockUseInvestigateAlert).toHaveBeenCalledWith({
    alertId: undefined,
    ebtElement: 'alertDetailsPageActions',
  });
});

it('disables the action and shows a spinner during the start request', () => {
  const { result } = renderItems({
    isStarting: true,
    isInvestigating: true,
    showInvestigateButton: false,
    investigateActionLabel: 'Investigating…',
  });
  expect(result.current).toHaveLength(1);
  expect(result.current[0]).toMatchObject({
    label: 'Investigating…',
    disableButton: true,
    isLoading: true,
  });
});

it.each(['running', 'completed'])('links to a %s investigation and marks it viewed', (state) => {
  const { result } = renderItems({
    hasInvestigation: true,
    showInvestigateButton: false,
    isInvestigating: state === 'running',
    viewInvestigationUrl: '/app/nightshift?investigationId=inv-1',
    viewInvestigationEbtProps: {
      ...investigation.viewInvestigationEbtProps,
      'data-ebt-detail': state,
    },
  });
  expect(result.current).toHaveLength(1);
  expect(result.current[0]).toMatchObject({
    label: 'View investigation',
    href: '/app/nightshift?investigationId=inv-1',
    ebt: { action: 'viewInvestigation', detail: state },
  });
  result.current[0].run?.();
  expect(markInvestigationViewed).toHaveBeenCalledTimes(1);
  expect(mockNavigateToUrl).toHaveBeenCalledWith('/app/nightshift?investigationId=inv-1');
  expect(handleInvestigate).not.toHaveBeenCalled();
});

it('keeps Re-investigate exclusively in overflow after a finished investigation was viewed', () => {
  const { result } = renderItems({
    hasInvestigation: true,
    showViewInvestigation: true,
    investigateActionLabel: 'Re-investigate',
    viewInvestigationUrl: '/app/nightshift?investigationId=inv-1',
  });
  expect(result.current).toHaveLength(2);
  expect(result.current[0]).toMatchObject({ label: 'View investigation', overflow: false });
  expect(result.current[1]).toMatchObject({ label: 'Re-investigate', overflow: true });
  result.current[1].run?.();
  expect(handleInvestigate).toHaveBeenCalledTimes(1);
});
