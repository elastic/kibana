/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CertificatesPage } from './certificates';
import { render } from '../../utils/testing';
import { useHasMultipleSpaces } from '../../../../hooks/use_has_multiple_spaces';

jest.mock('../../../../hooks/use_has_multiple_spaces');

jest.setTimeout(10_000);

const useHasMultipleSpacesMock = useHasMultipleSpaces as jest.Mock;

describe('CertificatesPage', () => {
  it('renders expected elements for valid props', async () => {
    useHasMultipleSpacesMock.mockReturnValue({ hasMultipleSpaces: true, loading: false });

    const { findByText } = render(<CertificatesPage />);

    expect(await findByText('No Certificates found.')).toBeInTheDocument();
    expect(await findByText('Spaces')).toBeInTheDocument();
  });
});
