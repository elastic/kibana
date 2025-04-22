/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';

import { IndexPatternsMissingPromptComponent } from './index_patterns_missing_prompt';
import { TestProviders } from '../../../../common/mock';

jest.mock('../../../../common/lib/kibana');

describe('IndexPatternsMissingPrompt', () => {
  test('renders correctly against snapshot', () => {
    const { container } = render(
      <TestProviders>
        <IndexPatternsMissingPromptComponent />
      </TestProviders>
    );
    expect(container.children[0]).toMatchSnapshot();
  });
});
