/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ScriptTablePlatformBadges, type ScriptTablePlatformBadgesProps } from './platform_badges';
import { SUPPORTED_HOST_OS_TYPE } from '../../../../../../common/endpoint/constants';
import {
  createAppRootMockRenderer,
  type AppContextTestRender,
} from '../../../../../common/mock/endpoint';

describe('ScriptTablePlatformBadges component', () => {
  let mockedContext: AppContextTestRender;
  let render: (
    props?: ScriptTablePlatformBadgesProps
  ) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    render = (props?: ScriptTablePlatformBadgesProps) => {
      renderResult = mockedContext.render(
        <ScriptTablePlatformBadges {...props} data-test-subj="test" />
      );
      return renderResult;
    };
  });

  it('should render correctly with no platforms', () => {
    const { getByTestId } = render();
    const badgesContainer = getByTestId('test');
    expect(badgesContainer.childElementCount).toBe(0);
  });

  it('should render correctly with multiple platforms', () => {
    const { getByTestId } = render({ platforms: [...SUPPORTED_HOST_OS_TYPE] });

    const badgesContainer = getByTestId('test');
    expect(badgesContainer.childElementCount).toBe(3);
    expect(badgesContainer).toHaveTextContent('Windows');
    expect(badgesContainer).toHaveTextContent('Linux');
    expect(badgesContainer).toHaveTextContent('Mac');
  });
});
