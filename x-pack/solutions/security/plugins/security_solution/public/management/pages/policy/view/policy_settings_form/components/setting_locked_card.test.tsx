/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import React from 'react';
import { exactMatchText } from '../mocks';
import type { SettingLockedCardProps } from './setting_locked_card';
import { SettingLockedCard } from './setting_locked_card';

describe('Policy form SettingLockedCard component', () => {
  let formProps: SettingLockedCardProps;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    formProps = {
      title: 'Malware locked',
      'data-test-subj': 'test',
    };

    render = () => {
      renderResult = mockedContext.render(<SettingLockedCard {...formProps} />);
      return renderResult;
    };
  });

  it('should render with expected content', () => {
    const { getByTestId } = render();

    expect(getByTestId('test')).toHaveTextContent(
      exactMatchText(
        'Malware locked' +
          'Upgrade to Elastic Platinum' +
          'To turn on this protection, you must upgrade your license to Platinum, start a free 30-day ' +
          'trial, or spin up a ' +
          'cloud deployment' +
          '(external, opens in a new tab or window) ' +
          'on AWS, GCP, or Azure.Platinum'
      )
    );
  });
});
