/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render } from '@testing-library/react';

import { ChatAction } from '.';
import {
  TestDataQualityProviders,
  TestExternalProviders,
} from '../../mock/test_providers/test_providers';

describe('ChatAction', () => {
  it('should render new chat link', () => {
    render(
      <TestExternalProviders>
        <TestDataQualityProviders>
          <ChatAction markdownComment="test markdown" indexName="test-index" />
        </TestDataQualityProviders>
      </TestExternalProviders>
    );

    expect(screen.getByTestId('newChatLink')).toHaveTextContent('Ask Assistant');
  });
});
