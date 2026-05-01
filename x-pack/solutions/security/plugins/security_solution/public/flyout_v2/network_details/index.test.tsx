/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { Network } from '.';
import { FlowTargetSourceDest } from '../../../common/search_strategy';
import { TestProviders } from '../../common/mock';

const ip = '192.168.1.1';
const flowTarget = FlowTargetSourceDest.destination;

describe('<Network />', () => {
  it('should render header and content', () => {
    const { getByTestId } = render(
      <TestProviders>
        <Network ip={ip} flowTarget={flowTarget} />
      </TestProviders>
    );

    expect(getByTestId('network-details-flyout-headerText')).toHaveTextContent(ip);
  });
});
