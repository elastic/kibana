/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { useAIForSOCDetailsContext } from '../context';
import { TestProviders } from '../../../common/mock';
import { AttackDiscoverySection } from './attack_discovery_section';
import { ATTACK_DISCOVERY_SECTION_TEST_ID } from '..';

jest.mock('../context');
jest.mock('./attack_discovery_widget', () => ({
  AttackDiscoveryWidget: jest.fn(),
}));

describe('AttackDiscoverySection', () => {
  it('should render the attack discovery section', () => {
    (useAIForSOCDetailsContext as jest.Mock).mockReturnValue({
      eventId: 'eventId',
    });

    const { getByTestId } = render(
      <TestProviders>
        <AttackDiscoverySection />
      </TestProviders>
    );

    expect(getByTestId(ATTACK_DISCOVERY_SECTION_TEST_ID)).toHaveTextContent('Attack Discovery');
  });
});
