/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  ATTACK_DISCOVERY_DETAILS_ALERTS_BADGE_TEST_ID,
  ATTACK_DISCOVERY_DETAILS_ALERTS_TEST_ID,
  ATTACK_DISCOVERY_DETAILS_ATTACK_CHAIN_TEST_ID,
  ATTACK_DISCOVERY_DETAILS_CONTAINER_TEST_ID,
  AttackDiscoveryDetails,
} from './attack_discovery_details';
import type { AttackDiscovery } from '@kbn/elastic-assistant-common';

const attackDiscovery: AttackDiscovery = {
  alertIds: ['a', 'b', 'c'],
} as AttackDiscovery;

describe('AttackDiscoveryDetails', () => {
  it('should render the component', () => {
    const { getByTestId } = render(<AttackDiscoveryDetails attackDiscovery={attackDiscovery} />);

    expect(getByTestId(ATTACK_DISCOVERY_DETAILS_CONTAINER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ATTACK_DISCOVERY_DETAILS_ALERTS_TEST_ID)).toHaveTextContent('Alerts:');
    expect(getByTestId(ATTACK_DISCOVERY_DETAILS_ALERTS_BADGE_TEST_ID)).toHaveTextContent('3');
    expect(getByTestId(ATTACK_DISCOVERY_DETAILS_ATTACK_CHAIN_TEST_ID)).toHaveTextContent(
      'Attack chain'
    );
  });
});
