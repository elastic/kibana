/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ScriptNameNavLink, type ScriptNameNavLinkProps } from './script_name_nav_link';
import {
  createAppRootMockRenderer,
  type AppContextTestRender,
} from '../../../../../common/mock/endpoint';

describe('ScriptNameNavLink component', () => {
  let mockedContext: AppContextTestRender;
  let render: (props: ScriptNameNavLinkProps) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    render = (props: ScriptNameNavLinkProps) => {
      renderResult = mockedContext.render(<ScriptNameNavLink {...props} data-test-subj="test" />);
      return renderResult;
    };
  });

  it('should render correctly', () => {
    const { getByTestId } = render({
      name: 'Test Script',
      scriptId: 'test-script-id-123',
      queryParams: {},
    });
    const badgesContainer = getByTestId('test');
    expect(badgesContainer).toHaveTextContent('Test Script');
  });

  it('should set correct href', () => {
    const { getByTestId } = render({
      name: 'Test Script',
      scriptId: 'test-script-id-123',
      queryParams: {},
    });
    const linkElement = getByTestId('test') as HTMLAnchorElement;
    expect(linkElement.href).toContain('?selectedScriptId=test-script-id-123&show=details');
  });

  it('should set href based on queryParams', () => {
    const { getByTestId } = render({
      name: 'Test Script',
      scriptId: 'test-script-id-123',
      queryParams: {
        kuery: 'name: test-name*',
        page: 2,
        pageSize: 20,
        sortField: 'updatedBy',
        sortDirection: 'desc',
      },
    });
    const linkElement = getByTestId('test') as HTMLAnchorElement;
    expect(linkElement.href).toContain(
      '?kuery=name%3A%20test-name*&page=2&pageSize=20&sortField=updatedBy&sortDirection=desc&selectedScriptId=test-script-id-123&show=details'
    );
  });
});
