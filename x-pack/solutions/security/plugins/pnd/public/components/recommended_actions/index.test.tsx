/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import type { RecommendedResponseAction } from '@kbn/pnd-common';

import { renderWithPndProviders } from '../test_utils/render_with_pnd_providers';
import { RecommendedActions } from '.';
import * as i18n from './translations';

const ISOLATE_HOST: RecommendedResponseAction = {
  action_type: 'isolate_host',
  capability_ref: 'endpoint.isolate',
  execution: 'kibana_api',
  priority: 'immediate',
  rationale: 'The host is beaconing to a known C2 address.',
  targets: { alert_ids: ['alert-1', 'alert-2'], hosts: ['WKSTN-RECV01'], ips: [], users: [] },
  title: 'Isolate WKSTN-RECV01',
};

const REVOKE_USER: RecommendedResponseAction = {
  action_type: 'revoke_user_account',
  execution: 'manual',
  priority: 'hardening',
  rationale: 'The account authenticated from the compromised host.',
  targets: { alert_ids: [], hosts: [], ips: [], users: ['cfo@corp'] },
  title: 'Revoke the cfo@corp account',
};

describe('RecommendedActions', () => {
  it('renders a row per recommendation', () => {
    renderWithPndProviders(<RecommendedActions actions={[ISOLATE_HOST, REVOKE_USER]} />);

    expect(screen.getByTestId('pndRecommendedActionRow-0')).toBeInTheDocument();
    expect(screen.getByTestId('pndRecommendedActionRow-1')).toBeInTheDocument();
  });

  it('renders the title of each recommendation', () => {
    renderWithPndProviders(<RecommendedActions actions={[ISOLATE_HOST]} />);

    expect(screen.getByTestId('pndRecommendedActionTitle-0')).toHaveTextContent(
      'Isolate WKSTN-RECV01'
    );
  });

  it('renders the rationale of each recommendation', () => {
    renderWithPndProviders(<RecommendedActions actions={[ISOLATE_HOST]} />);

    expect(screen.getByTestId('pndRecommendedActionRationale-0')).toHaveTextContent(
      'The host is beaconing to a known C2 address.'
    );
  });

  it('names every kind of target the action touches', () => {
    renderWithPndProviders(<RecommendedActions actions={[ISOLATE_HOST]} />);

    expect(screen.getByTestId('pndRecommendedActionTargets-0')).toHaveTextContent(
      'Hosts: WKSTN-RECV01 · 2 alerts'
    );
  });

  it('says so when an action names no targets', () => {
    const noTargets = {
      ...ISOLATE_HOST,
      targets: { alert_ids: [], hosts: [], ips: [], users: [] },
    };

    renderWithPndProviders(<RecommendedActions actions={[noTargets]} />);

    expect(screen.getByTestId('pndRecommendedActionTargets-0')).toHaveTextContent(
      i18n.TARGETS_NONE
    );
  });

  it('badges a manual action as executed outside Kibana', () => {
    renderWithPndProviders(<RecommendedActions actions={[REVOKE_USER]} />);

    expect(screen.getByTestId('pndRecommendedActionManual-0')).toBeInTheDocument();
  });

  it('does not badge a Kibana-executable action as manual', () => {
    renderWithPndProviders(<RecommendedActions actions={[ISOLATE_HOST]} />);

    expect(screen.queryByTestId('pndRecommendedActionManual-0')).not.toBeInTheDocument();
  });

  it('renders a priority outside the enum as written', () => {
    // The parser does not enforce enum membership, so an unknown priority must still render.
    const unknownPriority = {
      ...ISOLATE_HOST,
      priority: 'urgent',
    } as unknown as RecommendedResponseAction;

    renderWithPndProviders(<RecommendedActions actions={[unknownPriority]} />);

    expect(screen.getByTestId('pndRecommendedActionPriority-0')).toHaveTextContent('urgent');
  });

  it('states that approving executes none of the recommendations', () => {
    renderWithPndProviders(<RecommendedActions actions={[ISOLATE_HOST]} />);

    expect(screen.getByTestId('pndRecommendedActionsNotExecuted')).toHaveTextContent(
      i18n.NOT_EXECUTED
    );
  });

  it('renders nothing when no actions were recommended', () => {
    // An empty panel is worse than no panel: the prose summary already covers this gate.
    renderWithPndProviders(<RecommendedActions actions={[]} />);

    expect(screen.queryByTestId('pndRecommendedActions')).not.toBeInTheDocument();
  });

  it('renders no controls, because nothing here is executable', () => {
    renderWithPndProviders(<RecommendedActions actions={[ISOLATE_HOST, REVOKE_USER]} />);

    expect(screen.queryAllByRole('button')).toEqual([]);
    expect(screen.queryAllByRole('switch')).toEqual([]);
  });
});
