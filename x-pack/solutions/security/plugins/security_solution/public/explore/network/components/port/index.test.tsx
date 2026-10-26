/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, render } from '@testing-library/react';
import React from 'react';

import { removeExternalLinkText } from '@kbn/securitysolution-io-ts-utils';
import { TestProviders } from '../../../../common/mock/test_providers';

import { Port } from '.';

jest.mock('../../../../common/lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

describe('Port', () => {
  test('renders correctly against snapshot', () => {
    const { container } = render(<Port value="443" />);
    expect(container.children[0]).toMatchSnapshot();
  });

  test('it renders the port', () => {
    render(
      <TestProviders>
        <Port value="443" />
      </TestProviders>
    );

    expect(
      removeExternalLinkText(screen.getByTestId('port-or-service-name-link')?.textContent || '')
    ).toContain('443');
  });

  test('it hyperlinks links destination.port to an external service that describes the purpose of the port', () => {
    render(
      <TestProviders>
        <Port value="443" />
      </TestProviders>
    );

    expect(screen.getByTestId('port-or-service-name-link').getAttribute('href')).toEqual(
      'https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=443'
    );
  });
});
