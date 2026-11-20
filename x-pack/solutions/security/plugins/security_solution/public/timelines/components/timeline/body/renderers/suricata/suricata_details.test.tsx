/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { removeExternalLinkText } from '@kbn/securitysolution-io-ts-utils';
import { mockTimelineData } from '../../../../../../common/mock';
import { TestProviders } from '../../../../../../common/mock/test_providers';
import { SuricataDetails } from './suricata_details';
import { render, screen, waitFor } from '@testing-library/react';

jest.mock('../../../../../../common/lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

jest.mock('../../../../../../common/components/link_to');

describe('SuricataDetails', () => {
  describe('rendering', () => {
    test('it renders the default SuricataDetails', async () => {
      render(
        <TestProviders>
          <SuricataDetails data={mockTimelineData[2].ecs} scopeId="test" />
        </TestProviders>
      );
      await waitFor(() => expect(screen.getByTestId('suricataRefs')).toBeInTheDocument());
      expect(screen.getByText('ET')).toBeInTheDocument();
      expect(screen.getByText('EXPLOIT')).toBeInTheDocument();
      expect(screen.getByText('Source')).toBeInTheDocument();
      expect(screen.getByText('Destination')).toBeInTheDocument();
    });

    test('it returns text if the data does contain suricata data', async () => {
      const { container } = render(
        <TestProviders>
          <SuricataDetails data={mockTimelineData[2].ecs} scopeId="test" />
        </TestProviders>
      );
      await waitFor(() => expect(screen.getByTestId('suricataRefs')).toBeInTheDocument());
      const removeEuiIconText = removeExternalLinkText(container.textContent ?? '').replaceAll(
        'External link',
        ''
      );
      expect(removeEuiIconText).toEqual(
        '4ETEXPLOITNETGEARWNR2000v5 hidden_lang_avi Stack Overflow (CVE-2016-10174)Source192.168.0.3:53Destination192.168.0.3:6343'
      );
    });

    test('it returns null for text if the data contains no suricata data', () => {
      const { container } = render(
        <SuricataDetails data={mockTimelineData[0].ecs} scopeId="test" />
      );
      expect(container).toBeEmptyDOMElement();
    });
  });
});
