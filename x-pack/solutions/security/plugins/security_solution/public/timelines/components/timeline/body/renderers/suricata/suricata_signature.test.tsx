/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '../../../../../../common/mock';
import {
  SuricataSignature,
  Tokens,
  SignatureId,
  SURICATA_SIGNATURE_ID_FIELD_NAME,
} from './suricata_signature';

jest.mock('../../../../../../common/lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

describe('SuricataSignature', () => {
  describe('rendering', () => {
    test('it renders the default SuricataSignature', () => {
      render(
        <TestProviders>
          <SuricataSignature
            scopeId="test"
            id="doc-id-123"
            signatureId={123}
            signature="ET SCAN ATTACK Hello"
          />
        </TestProviders>
      );
      expect(screen.getByText('123')).toBeInTheDocument();
      expect(screen.getByText('ET')).toBeInTheDocument();
      expect(screen.getByText('SCAN')).toBeInTheDocument();
      expect(screen.getByText('ATTACK')).toBeInTheDocument();
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });
  });

  describe('Tokens', () => {
    test('should render empty if tokens are empty', () => {
      const { container } = render(<Tokens tokens={[]} />);
      expect(container).toBeEmptyDOMElement();
    });

    test('should render a single if it is present', () => {
      const { container } = render(
        <div>
          <Tokens tokens={['ET']} />
        </div>
      );
      expect(container).toHaveTextContent(/^ET$/);
    });

    test('should render the multiple tokens if they are present', () => {
      const { container } = render(
        <div>
          <Tokens tokens={['ET', 'SCAN']} />
        </div>
      );
      expect(container).toHaveTextContent(/^ETSCAN$/);
    });
  });

  describe('SignatureId', () => {
    test('it renders the default SuricataSignature', () => {
      const { container } = render(
        <TestProviders>
          <SignatureId signatureId={123} scopeId="test" />
        </TestProviders>
      );
      expect(container).toHaveTextContent(/^123$/);
    });

    test('it renders a tooltip for the signature field', async () => {
      render(
        <TestProviders>
          <SignatureId signatureId={123} scopeId="test" />
        </TestProviders>
      );

      await userEvent.hover(screen.getByText('123'));

      expect(await screen.findByText(SURICATA_SIGNATURE_ID_FIELD_NAME)).toBeInTheDocument();
    });
  });
});
