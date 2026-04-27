/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { useKibana } from '../../../../common/services';
import * as i18n from './translations';
import { UpgradeActions } from '.';

jest.mock('../../../../common/services', () => ({
  useKibana: jest.fn(),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const getUrlForAppMock = jest
  .fn()
  .mockReturnValue('http://localhost:5601/app/management/stack/license_management');

describe('UpgradeActions', () => {
  beforeEach(() => {
    getUrlForAppMock.mockClear();
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          getUrlForApp: getUrlForAppMock,
        },
      },
    } as unknown as ReturnType<typeof useKibana>);
    render(<UpgradeActions />);
  });

  describe('upgrade docs button', () => {
    it('renders the expected button text', () => {
      expect(screen.getByTestId('upgradeDocs')).toHaveTextContent(i18n.UPGRADE_DOCS);
    });

    it('opens the link in a new tab', () => {
      expect(screen.getByTestId('upgradeDocs')).toHaveAttribute('target', '_blank');
    });
  });

  describe('upgrade call to action button', () => {
    it('renders the expected button text', () => {
      expect(screen.getByTestId('upgradeCta')).toHaveTextContent(i18n.UPGRADE_CTA);
    });

    it('navigates to license management in the same tab', () => {
      expect(screen.getByTestId('upgradeCta')).not.toHaveAttribute('target');
    });

    it('links to the license management page', () => {
      expect(screen.getByTestId('upgradeCta')).toHaveAttribute(
        'href',
        'http://localhost:5601/app/management/stack/license_management'
      );
    });

    it('resolves license management via the management deep link', () => {
      expect(getUrlForAppMock).toHaveBeenCalledWith('management', {
        deepLinkId: 'license_management',
      });
    });
  });
});
