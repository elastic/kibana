/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { EntitiesOverview } from './entities_overview';
import { INSIGHTS_ENTITIES_TEST_ID } from '../constants/test_ids';
import { useAttackEntitiesCounts } from '../../../flyout/attack_details/hooks/use_attack_entities_counts';

jest.mock('@kbn/i18n-react', () => ({
  FormattedMessage: ({ defaultMessage, id }: { defaultMessage: string; id: string }) => (
    <span data-testid={id}>{defaultMessage}</span>
  ),
}));

jest.mock('../../../flyout/attack_details/hooks/use_attack_entities_counts', () => ({
  useAttackEntitiesCounts: jest.fn(),
}));

const renderWithEui = (ui: React.ReactElement) => render(<EuiProvider>{ui}</EuiProvider>);

describe('EntitiesOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAttackEntitiesCounts).mockReturnValue({
      relatedUsers: 2,
      relatedHosts: 3,
      loading: false,
      error: false,
    });
  });

  it('renders the section with the entities test id', () => {
    renderWithEui(<EntitiesOverview onShowAttackEntities={jest.fn()} />);

    expect(screen.getByTestId(INSIGHTS_ENTITIES_TEST_ID)).toBeInTheDocument();
  });

  it('renders the related users and related hosts labels', () => {
    renderWithEui(<EntitiesOverview onShowAttackEntities={jest.fn()} />);

    expect(screen.getByText('Related users')).toBeInTheDocument();
    expect(screen.getByText('Related hosts')).toBeInTheDocument();
  });

  it('renders related users and hosts counts in badges', () => {
    renderWithEui(<EntitiesOverview onShowAttackEntities={jest.fn()} />);

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders skeleton loaders for both counts when loading', () => {
    jest.mocked(useAttackEntitiesCounts).mockReturnValue({
      relatedUsers: 0,
      relatedHosts: 0,
      loading: true,
      error: false,
    });

    renderWithEui(<EntitiesOverview onShowAttackEntities={jest.fn()} />);

    // Both badges are replaced with skeletons; their numeric content is absent.
    expect(screen.queryByText('2')).not.toBeInTheDocument();
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });

  it('renders the section title as a clickable link with the chevron link icon', () => {
    renderWithEui(<EntitiesOverview onShowAttackEntities={jest.fn()} />);

    expect(screen.getByTestId(`${INSIGHTS_ENTITIES_TEST_ID}TitleLink`)).toBeInTheDocument();
    expect(screen.getByTestId(`${INSIGHTS_ENTITIES_TEST_ID}LinkIcon`)).toBeInTheDocument();
    expect(screen.queryByTestId(`${INSIGHTS_ENTITIES_TEST_ID}TitleText`)).not.toBeInTheDocument();
  });

  it('invokes onShowAttackEntities when the title link is clicked', () => {
    const onShowAttackEntities = jest.fn();

    renderWithEui(<EntitiesOverview onShowAttackEntities={onShowAttackEntities} />);

    fireEvent.click(screen.getByTestId(`${INSIGHTS_ENTITIES_TEST_ID}TitleLink`));

    expect(onShowAttackEntities).toHaveBeenCalledTimes(1);
  });
});
