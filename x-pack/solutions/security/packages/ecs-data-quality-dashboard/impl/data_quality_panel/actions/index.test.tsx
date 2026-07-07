/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { Actions } from '.';
import {
  TestDataQualityProviders,
  TestExternalProviders,
} from '../mock/test_providers/test_providers';

describe('Actions', () => {
  it('renders nothing by default', () => {
    const { container } = render(<Actions markdownComment="some markdown" />);

    expect(container).toBeEmptyDOMElement();
  });

  describe('given showAddToNewCaseAction is true', () => {
    it('renders AddToNewCaseAction', () => {
      const { getByTestId } = render(
        <TestExternalProviders>
          <TestDataQualityProviders>
            <Actions markdownComment="some markdown" showAddToNewCaseAction />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      expect(getByTestId('addToNewCase')).toBeInTheDocument();
    });
  });

  describe('given showCopyToClipboardAction is true', () => {
    it('renders CopyToClipboardAction', () => {
      const { getByTestId } = render(
        <TestExternalProviders>
          <TestDataQualityProviders>
            <Actions markdownComment="some markdown" showCopyToClipboardAction />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      expect(getByTestId('copyToClipboard')).toBeInTheDocument();
    });
  });

  describe('given showChatAction is true and indexName is present', () => {
    it('renders ChatAction', () => {
      const { getByTestId } = render(
        <TestExternalProviders>
          <TestDataQualityProviders>
            <Actions markdownComment="some markdown" showChatAction indexName="some-index" />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      expect(getByTestId('newChatLink')).toBeInTheDocument();
    });
  });
});
