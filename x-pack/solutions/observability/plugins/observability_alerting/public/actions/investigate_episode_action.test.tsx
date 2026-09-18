/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import { useInvestigateAlert } from '@kbn/observability-plugin/public/hooks/use_investigate_alert';
import {
  createInvestigateEpisodeAction,
  INVESTIGATE_EPISODE_ACTION_ID,
} from './investigate_episode_action';

jest.mock('@kbn/observability-plugin/public/hooks/use_investigate_alert');

const mockUseInvestigateAlert = jest.mocked(useInvestigateAlert);

const makeClassicEpisode = (alertUuid = 'alert-1'): AlertEpisode =>
  ({
    '@timestamp': '2026-09-15T12:00:00.000Z',
    'episode.id': alertUuid,
    'episode.status': 'active',
    'rule.id': 'rule-1',
    'rule.name': 'Rule 1',
    group_hash: alertUuid,
    first_timestamp: '2026-09-15T12:00:00.000Z',
    last_timestamp: '2026-09-15T12:00:00.000Z',
    duration: 0,
    triggered_at: '2026-09-15T12:00:00.000Z',
    last_assignee_uid: null,
    last_tags: [],
    last_ack_action: null,
    episode_data: null,
    severity: 'critical',
    supports_actions: false,
    supports_timeline: false,
    source_action_context: {
      index: '.alerts-observability.test',
      alertUuid,
      instanceId: undefined,
      ruleId: 'rule-1',
      workflowStatus: 'open',
      workflowTags: [],
    },
  } as unknown as AlertEpisode);

const makeNativeEpisode = (episodeId = 'v2-ep-1'): AlertEpisode =>
  ({
    '@timestamp': '2026-09-15T12:00:00.000Z',
    'episode.id': episodeId,
    'episode.status': 'active',
    'rule.id': 'rule-v2',
    'rule.name': 'Rule V2',
    group_hash: 'group-1',
    first_timestamp: '2026-09-15T12:00:00.000Z',
    last_timestamp: '2026-09-15T12:00:00.000Z',
    duration: 0,
    triggered_at: '2026-09-15T12:00:00.000Z',
    last_assignee_uid: null,
    last_tags: [],
    last_ack_action: null,
    episode_data: null,
    severity: 'critical',
    supports_actions: true,
    supports_timeline: true,
  } as unknown as AlertEpisode);

describe('createInvestigateEpisodeAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseInvestigateAlert.mockReturnValue({
      showInvestigateAction: true,
      handleInvestigate: jest.fn(),
      isInvestigating: false,
      investigateActionLabel: 'Investigate',
      viewInvestigationUrl: undefined,
      viewInvestigationActionLabel: 'View investigation',
    });
  });

  it('has correct metadata and order 60', () => {
    const action = createInvestigateEpisodeAction();
    expect(action.id).toBe(INVESTIGATE_EPISODE_ACTION_ID);
    expect(action.order).toBe(60);
    expect(action.iconType).toBe('inspect');
  });

  it('isCompatible returns true only for a single classic alert episode', () => {
    const action = createInvestigateEpisodeAction();
    const classic = makeClassicEpisode('alert-1');
    const native = makeNativeEpisode('v2-ep-1');

    expect(action.isCompatible({ episodes: [classic] })).toBe(true);
    expect(action.isCompatible({ episodes: [native] })).toBe(false);
    expect(action.isCompatible({ episodes: [classic, makeClassicEpisode('alert-2')] })).toBe(false);
    expect(action.isCompatible({ episodes: [] })).toBe(false);
  });

  it('showWhenDisabled mirrors compatibility check', () => {
    const action = createInvestigateEpisodeAction();
    const classic = makeClassicEpisode('alert-1');
    const native = makeNativeEpisode('v2-ep-1');

    expect(action.showWhenDisabled?.({ episodes: [classic] })).toBe(true);
    expect(action.showWhenDisabled?.({ episodes: [native] })).toBe(false);
  });

  it('renders Investigate button in menu item', () => {
    const action = createInvestigateEpisodeAction();
    const handleInvestigate = jest.fn();
    mockUseInvestigateAlert.mockReturnValue({
      showInvestigateAction: true,
      handleInvestigate,
      isInvestigating: false,
      investigateActionLabel: 'Investigate',
      viewInvestigationUrl: undefined,
      viewInvestigationActionLabel: 'View investigation',
    });

    render(
      <>
        {action.renderMenuItem!({
          episodes: [makeClassicEpisode('alert-1')],
          closeMenu: jest.fn(),
        })}
      </>
    );

    const button = screen.getByTestId('investigateAlert');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Investigate');
    expect(button).not.toBeDisabled();

    fireEvent.click(button);
    expect(handleInvestigate).toHaveBeenCalledTimes(1);
  });

  it('renders disabled button when isInvestigating is true', () => {
    const action = createInvestigateEpisodeAction();
    mockUseInvestigateAlert.mockReturnValue({
      showInvestigateAction: true,
      handleInvestigate: jest.fn(),
      isInvestigating: true,
      investigateActionLabel: 'Investigating',
      viewInvestigationUrl: undefined,
      viewInvestigationActionLabel: 'View investigation',
    });

    render(
      <>
        {action.renderMenuItem!({
          episodes: [makeClassicEpisode('alert-1')],
          closeMenu: jest.fn(),
        })}
      </>
    );

    const button = screen.getByTestId('investigateAlert');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Investigating');
    expect(button).toBeDisabled();
  });

  it('renders View investigation and Re-investigate when investigation exists', () => {
    const action = createInvestigateEpisodeAction();
    const closeMenu = jest.fn();
    mockUseInvestigateAlert.mockReturnValue({
      showInvestigateAction: true,
      handleInvestigate: jest.fn(),
      isInvestigating: false,
      investigateActionLabel: 'Re-investigate',
      viewInvestigationUrl: '/app/nightshift?investigationId=inv-1',
      viewInvestigationActionLabel: 'View investigation',
    });

    render(<>{action.renderMenuItem!({ episodes: [makeClassicEpisode('alert-1')], closeMenu })}</>);

    const viewButton = screen.getByTestId('viewAlertInvestigation');
    expect(viewButton).toBeInTheDocument();
    expect(viewButton).toHaveAttribute('href', '/app/nightshift?investigationId=inv-1');
    expect(viewButton).toHaveTextContent('View investigation');

    const investigateButton = screen.getByTestId('investigateAlert');
    expect(investigateButton).toBeInTheDocument();
    expect(investigateButton).toHaveTextContent('Re-investigate');

    fireEvent.click(viewButton);
    expect(closeMenu).toHaveBeenCalledTimes(1);
  });

  it('returns null when neither action is available', () => {
    const action = createInvestigateEpisodeAction();
    mockUseInvestigateAlert.mockReturnValue({
      showInvestigateAction: false,
      handleInvestigate: jest.fn(),
      isInvestigating: false,
      investigateActionLabel: 'Investigate',
      viewInvestigationUrl: undefined,
      viewInvestigationActionLabel: 'View investigation',
    });

    const { container } = render(
      <>
        {action.renderMenuItem!({
          episodes: [makeClassicEpisode('alert-1')],
          closeMenu: jest.fn(),
        })}
      </>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
