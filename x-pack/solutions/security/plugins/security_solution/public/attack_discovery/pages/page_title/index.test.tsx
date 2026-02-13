/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { PageTitle } from '.';
import { ATTACK_DISCOVERY_PAGE_TITLE } from './translations';
import { useKibana } from '../../../common/lib/kibana';

jest.mock('../../../common/lib/kibana');

describe('PageTitle', () => {
  const mockGetSetting = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        uiSettings: { get: mockGetSetting },
      },
    });
    mockGetSetting.mockReturnValue(false);
  });

  it('renders the expected title', () => {
    render(<PageTitle />);

    const attackDiscoveryPageTitle = screen.getByTestId('attackDiscoveryPageTitle');

    expect(attackDiscoveryPageTitle).toHaveTextContent(ATTACK_DISCOVERY_PAGE_TITLE);
  });

  describe('Attacks page announcement', () => {
    it('renders the Attacks page announcement when `enableAlertsAndAttacksAlignment` setting is enabled', () => {
      mockGetSetting.mockReturnValue(true);

      render(<PageTitle />);

      expect(screen.getByTestId('attackDiscoveryAnnouncementBadge')).toBeInTheDocument();
    });

    it('does not render the Attacks page announcement when `enableAlertsAndAttacksAlignment` setting is disabled', () => {
      mockGetSetting.mockReturnValue(false);

      render(<PageTitle />);

      expect(screen.queryByTestId('attackDiscoveryAnnouncementBadge')).not.toBeInTheDocument();
    });
  });
});
