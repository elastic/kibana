/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { ActionConnectorWarnings } from '.';

jest.mock('../../../lib/kibana/kibana_react', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: { http: { basePath: { prepend: jest.fn() } } },
  }),
}));
describe('ActionConnectorWarnings', () => {
  test('should not render if importedActionConnectorsCount is falsy and empty warnings array', () => {
    const wrapper = render(
      <ActionConnectorWarnings actionConnectorsWarnings={[]} importedActionConnectorsCount={0} />
    );
    expect(wrapper.container).toMatchSnapshot();
    expect(wrapper.queryByTestId('actionConnectorsWarningsCallOut')).not.toBeInTheDocument();
  });
  test('should not render if importedActionConnectorsCount is truthy and empty warnings array', () => {
    const wrapper = render(
      <ActionConnectorWarnings actionConnectorsWarnings={[]} importedActionConnectorsCount={2} />
    );
    expect(wrapper.container).toMatchSnapshot();
    expect(wrapper.queryByTestId('actionConnectorsWarningsCallOut')).not.toBeInTheDocument();
  });
  test('should render if 1 connectors were imported and use the warning message with the correct imported number', () => {
    const wrapper = render(
      <ActionConnectorWarnings
        actionConnectorsWarnings={[
          {
            actionPath: '/',
            buttonLabel: '',
            message: '1 connector has sensitive information that requires updates.',
            type: '',
          },
        ]}
        importedActionConnectorsCount={1}
      />
    );
    const { getByTestId } = wrapper;
    expect(wrapper.container).toMatchSnapshot();
    expect(getByTestId('actionConnectorsWarningsCallOutTitle').textContent).toBe(
      '1 connector imported'
    );
    expect(getByTestId('actionConnectorsWarningsCallOutMessage').textContent).toBe(
      '1 connector has sensitive information that requires updates.'
    );
  });
  test('should render if 2 connectors were imported and use the warning message with the correct imported number', () => {
    const wrapper = render(
      <ActionConnectorWarnings
        actionConnectorsWarnings={[
          {
            actionPath: '/',
            buttonLabel: '',
            message: '2 connectors have sensitive information that requires updates.',
            type: '',
          },
        ]}
        importedActionConnectorsCount={2}
      />
    );
    const { getByTestId } = wrapper;
    expect(wrapper.container).toMatchSnapshot();
    expect(getByTestId('actionConnectorsWarningsCallOutTitle').textContent).toBe(
      '2 connectors imported'
    );
    expect(getByTestId('actionConnectorsWarningsCallOutMessage').textContent).toBe(
      '2 connectors have sensitive information that requires updates.'
    );
    expect(getByTestId('actionConnectorsWarningsCallOutButton').textContent).toBe(
      'Go to connectors'
    );
  });
  test('should render if 2 connectors were imported and use the button label when is set', () => {
    const wrapper = render(
      <ActionConnectorWarnings
        actionConnectorsWarnings={[
          {
            actionPath: '/',
            buttonLabel: 'Connectors',
            message: '2 connectors have sensitive information that requires updates.',
            type: '',
          },
        ]}
        importedActionConnectorsCount={2}
      />
    );
    const { getByTestId } = wrapper;
    expect(wrapper.container).toMatchSnapshot();
    expect(getByTestId('actionConnectorsWarningsCallOutTitle').textContent).toBe(
      '2 connectors imported'
    );
    expect(getByTestId('actionConnectorsWarningsCallOutMessage').textContent).toBe(
      '2 connectors have sensitive information that requires updates.'
    );
    expect(getByTestId('actionConnectorsWarningsCallOutButton').textContent).toBe('Connectors');
  });
});
