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
  let render: (props?: ScriptNameNavLinkProps) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let defaultProps: ScriptNameNavLinkProps;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();

    defaultProps = {
      name: 'Test Script',
      queryParams: { page: 1, pageSize: 10, sortField: 'name', sortDirection: 'asc' },
      scriptId: 'script-1',
      onClick: jest.fn(),
      'data-test-subj': 'test',
    };
    render = (props?: ScriptNameNavLinkProps) => {
      renderResult = mockedContext.render(
        <ScriptNameNavLink {...(props ?? defaultProps)} data-test-subj="test" />
      );
      return renderResult;
    };
  });

  it('should render correctly', () => {
    const { getByTestId } = render();
    const nameElement = getByTestId('test-name-link');
    expect(nameElement).toHaveTextContent('Test Script');
  });

  it('should call onClick when name is clicked', () => {
    const { getByTestId } = render();
    const nameElement = getByTestId('test-name-link');
    nameElement.click();
    expect(defaultProps.onClick).toHaveBeenCalled();
  });

  it('should have correct href for navigation', () => {
    const { getByTestId } = render();
    const nameElement = getByTestId('test-name-link');
    expect(nameElement).toHaveAttribute(
      'href',
      '/app/security/administration/scripts_library?page=1&pageSize=10&sortField=name&sortDirection=asc&selectedScriptId=script-1&show=details'
    );
  });

  it('should update the href for navigation when queryParams change', () => {
    const { getByTestId } = render({
      ...defaultProps,
      queryParams: { page: 2, pageSize: 20, sortField: 'updatedAt', sortDirection: 'desc' },
    });
    const nameElement = getByTestId('test-name-link');
    expect(nameElement).toHaveAttribute(
      'href',
      '/app/security/administration/scripts_library?page=2&pageSize=20&sortField=updatedAt&sortDirection=desc&selectedScriptId=script-1&show=details'
    );
  });
});
