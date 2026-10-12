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
  }) as unknown as AlertEpisode;

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
  }) as unknown as AlertEpisode;

const ebtProps = {
  investigateEbtProps: {
    'data-ebt-action': 'startInvestigation',
    'data-ebt-element': 'episodesTableRowActions',
  },
  viewInvestigationEbtProps: {
    'data-ebt-action': 'viewInvestigation',
    'data-ebt-element': 'episodesTableRowActions',
  },
};

describe('createInvestigateEpisodeAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseInvestigateAlert.mockReturnValue({
      ...ebtProps,
      showInvestigateAction: true,
      showInvestigateButton: true,
      showViewInvestigation: false,
      handleInvestigate: jest.fn(),
      isInvestigating: false,
      investigateActionLabel: 'Investigate',
      viewInvestigationUrl: undefined,
      viewInvestigationActionLabel: 'View investigation',
      markInvestigationViewed: jest.fn(),
    });
  });

  it('has correct metadata, order 35, and isWorkflowAction: true', () => {
    const action = createInvestigateEpisodeAction();
    expect(action.id).toBe(INVESTIGATE_EPISODE_ACTION_ID);
    expect(action.order).toBe(35);
    expect(action.isWorkflowAction).toBe(true);
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

  it('renders Investigate button with inspect icon in menu item', () => {
    const action = createInvestigateEpisodeAction();
    const handleInvestigate = jest.fn();
    mockUseInvestigateAlert.mockReturnValue({
      ...ebtProps,
      showInvestigateAction: true,
      showInvestigateButton: true,
      showViewInvestigation: false,
      handleInvestigate,
      isInvestigating: false,
      investigateActionLabel: 'Investigate',
      viewInvestigationUrl: undefined,
      viewInvestigationActionLabel: 'View investigation',
      markInvestigationViewed: jest.fn(),
    });

    render(
      <>
        {action.renderMenuItem!({
          episodes: [makeClassicEpisode('alert-1')],
          closeMenu: jest.fn(),
          surface: 'row_menu',
        })}
      </>
    );

    const button = screen.getByTestId('investigateAlert');
    expect(mockUseInvestigateAlert).toHaveBeenCalledWith(
      expect.objectContaining({ ebtElement: 'episodesTableRowActions' })
    );
    expect(button).toHaveAttribute('data-ebt-action', 'startInvestigation');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Investigate');
    expect(button).not.toBeDisabled();
    expect(button.querySelector('[data-euiicon-type="inspect"]')).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleInvestigate).toHaveBeenCalledTimes(1);
  });

  it('uses the flyout EBT element when rendered in the details flyout menu', () => {
    const action = createInvestigateEpisodeAction();

    render(
      <>
        {action.renderMenuItem!({
          episodes: [makeClassicEpisode('alert-1')],
          surface: 'details_flyout',
        })}
      </>
    );

    expect(mockUseInvestigateAlert).toHaveBeenCalledWith(
      expect.objectContaining({ ebtElement: 'alertDetailsFlyoutActions' })
    );
  });

  it('renders disabled button with spinner when isInvestigating is true', () => {
    const action = createInvestigateEpisodeAction();
    mockUseInvestigateAlert.mockReturnValue({
      ...ebtProps,
      showInvestigateAction: true,
      showInvestigateButton: false,
      showViewInvestigation: false,
      handleInvestigate: jest.fn(),
      isInvestigating: true,
      investigateActionLabel: 'Investigating…',
      viewInvestigationUrl: undefined,
      viewInvestigationActionLabel: 'View investigation',
      markInvestigationViewed: jest.fn(),
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
    expect(button).toHaveTextContent('Investigating…');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
    expect(screen.queryByTestId('viewAlertInvestigation')).not.toBeInTheDocument();
  });

  it('renders View investigation only with eye icon when completed and not opened', () => {
    const action = createInvestigateEpisodeAction();
    const closeMenu = jest.fn();
    const markInvestigationViewed = jest.fn();
    mockUseInvestigateAlert.mockReturnValue({
      ...ebtProps,
      showInvestigateAction: true,
      showInvestigateButton: false,
      showViewInvestigation: true,
      handleInvestigate: jest.fn(),
      isInvestigating: false,
      investigateActionLabel: 'Investigate',
      viewInvestigationUrl: '/app/nightshift?investigationId=inv-1',
      viewInvestigationActionLabel: 'View investigation',
      markInvestigationViewed,
    });

    render(<>{action.renderMenuItem!({ episodes: [makeClassicEpisode('alert-1')], closeMenu })}</>);

    const viewButton = screen.getByTestId('viewAlertInvestigation');
    expect(viewButton).toBeInTheDocument();
    expect(viewButton).toHaveAttribute('href', '/app/nightshift?investigationId=inv-1');
    expect(viewButton).toHaveTextContent('View investigation');
    expect(viewButton.querySelector('[data-euiicon-type="eye"]')).toBeInTheDocument();
    expect(screen.queryByTestId('investigateAlert')).not.toBeInTheDocument();

    fireEvent.click(viewButton);
    expect(markInvestigationViewed).toHaveBeenCalledTimes(1);
    expect(closeMenu).toHaveBeenCalledTimes(1);
  });

  it('renders View investigation then Re-investigate when investigation is opened', () => {
    const action = createInvestigateEpisodeAction();
    const closeMenu = jest.fn();
    const markInvestigationViewed = jest.fn();
    mockUseInvestigateAlert.mockReturnValue({
      ...ebtProps,
      showInvestigateAction: true,
      showInvestigateButton: true,
      showViewInvestigation: true,
      handleInvestigate: jest.fn(),
      isInvestigating: false,
      investigateActionLabel: 'Re-investigate',
      viewInvestigationUrl: '/app/nightshift?investigationId=inv-1',
      viewInvestigationActionLabel: 'View investigation',
      markInvestigationViewed,
    });

    render(<>{action.renderMenuItem!({ episodes: [makeClassicEpisode('alert-1')], closeMenu })}</>);

    const viewButton = screen.getByTestId('viewAlertInvestigation');
    const investigateButton = screen.getByTestId('investigateAlert');

    expect(viewButton.compareDocumentPosition(investigateButton)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );

    expect(viewButton).toBeInTheDocument();
    expect(viewButton.querySelector('[data-euiicon-type="eye"]')).toBeInTheDocument();

    expect(investigateButton).toBeInTheDocument();
    expect(investigateButton).toHaveTextContent('Re-investigate');
    expect(investigateButton.querySelector('[data-euiicon-type="inspect"]')).toBeInTheDocument();

    fireEvent.click(viewButton);
    expect(markInvestigationViewed).toHaveBeenCalledTimes(1);
    expect(closeMenu).toHaveBeenCalledTimes(1);
  });

  it('returns null when investigation action is not available', () => {
    const action = createInvestigateEpisodeAction();
    mockUseInvestigateAlert.mockReturnValue({
      ...ebtProps,
      showInvestigateAction: false,
      showInvestigateButton: false,
      showViewInvestigation: false,
      handleInvestigate: jest.fn(),
      isInvestigating: false,
      investigateActionLabel: 'Investigate',
      viewInvestigationUrl: undefined,
      viewInvestigationActionLabel: 'View investigation',
      markInvestigationViewed: jest.fn(),
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
