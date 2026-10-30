/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShowAttackButton } from './show_attack_button';
import { useFlyoutApi } from '../../../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../../../flyout_v2/use_flyout_api.mock';
import { FLYOUT_ORIGIN } from '../../../../common/lib/telemetry';

// The attachment snapshots the attack document's `_index`, i.e. the concrete backing index.
const props = {
  id: 'action-id',
  attackId: 'attack-id-1',
  indexName: '.internal.alerts-security.attack.discovery.alerts-default-000001',
  attackTitle: 'Credential harvesting on host-1',
};

// What the flyout is opened with: the readable alias pattern, not the backing index.
const EXPECTED_INDEX_NAME = '.alerts-security.attack.discovery.alerts-*';

const TEST_SUBJ = 'comment-action-show-attack-action-id';

jest.mock('../../../../flyout_v2/use_flyout_api');

describe('ShowAttackButton', () => {
  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    flyoutApi = createFlyoutApiMock();
    jest.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
  });

  it('renders the show attack button with a tooltip and an aria label', async () => {
    render(<ShowAttackButton {...props} />);

    const button = screen.getByTestId(TEST_SUBJ);
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Show attack details');

    fireEvent.mouseOver(button);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Show attack details');
  });

  it('opens the attack flyout', () => {
    render(<ShowAttackButton {...props} />);
    fireEvent.click(screen.getByTestId(TEST_SUBJ));

    expect(flyoutApi.openAttackFlyout).toHaveBeenCalledWith({
      attackId: 'attack-id-1',
      indexName: EXPECTED_INDEX_NAME,
      attackTitle: 'Credential harvesting on host-1',
      origin: FLYOUT_ORIGIN.CASE_ATTACHMENT,
    });
  });

  it('opens an adhoc attack with the adhoc index pattern', () => {
    render(
      <ShowAttackButton
        {...props}
        indexName=".internal.adhoc.alerts-security.attack.discovery.alerts-default-000001"
      />
    );
    fireEvent.click(screen.getByTestId(TEST_SUBJ));

    expect(flyoutApi.openAttackFlyout).toHaveBeenCalledWith(
      expect.objectContaining({
        indexName: '.adhoc.alerts-security.attack.discovery.alerts-*',
      })
    );
  });
});
