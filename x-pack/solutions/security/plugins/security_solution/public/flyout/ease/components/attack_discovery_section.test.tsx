/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { useEaseDetailsContext } from '../context';
import { TestProviders } from '../../../common/mock';
import { AttackDiscoverySection } from './attack_discovery_section';
import { ATTACK_DISCOVERY_SECTION_TEST_ID } from '..';

vi.mock('../context');
vi.mock('./attack_discovery_widget', () => {
      const mocked = {
      AttackDiscoveryWidget: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

describe('AttackDiscoverySection', () => {
  it('should render the attack discovery section', () => {
    (useEaseDetailsContext as Mock).mockReturnValue({
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
