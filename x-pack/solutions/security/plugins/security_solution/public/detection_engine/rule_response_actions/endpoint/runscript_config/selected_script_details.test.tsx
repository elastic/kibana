/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppContextTestRender } from '../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { EndpointScriptsGenerator } from '../../../../../common/endpoint/data_generators/endpoint_scripts_generator';
import { SelectedScriptDetails } from './selected_script_details';
import type { EndpointScript } from '../../../../../common/endpoint/types';
import { getEmptyValue } from '../../../../common/components/empty_value';

describe('SelectedScriptDetails', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let mockedContext: AppContextTestRender;
  let scriptGenerator: EndpointScriptsGenerator;
  let mockScript: EndpointScript;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    scriptGenerator = new EndpointScriptsGenerator('seed');

    render = () => {
      renderResult = mockedContext.render(
        <SelectedScriptDetails script={mockScript} data-test-subj="test" />
      );
      return renderResult;
    };
  });

  it('should render description, instructions and example when they are defined', () => {
    mockScript = scriptGenerator.generate({
      description: 'Test script description',
      instructions: 'Test script instructions',
      example: 'Test script example',
    });

    render();

    expect(renderResult.getByTestId('test-description')).toHaveTextContent(mockScript.description!);
    expect(renderResult.getByTestId('test-instructions')).toHaveTextContent(
      mockScript.instructions!
    );
    expect(renderResult.getByTestId('test-example')).toHaveTextContent(mockScript.example!);
  });

  it('should not render sections when description, instructions and example are empty or undefined', () => {
    mockScript = scriptGenerator.generate({
      description: '',
      instructions: '',
      example: '',
    });

    render();

    expect(renderResult.getByTestId('test-description')).toHaveTextContent(getEmptyValue());
    expect(renderResult.getByTestId('test-instructions')).toHaveTextContent(getEmptyValue());
    expect(renderResult.getByTestId('test-example')).toHaveTextContent(getEmptyValue());
  });
});
