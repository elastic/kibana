/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from '@kbn/shared-ux-router';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { useKibana as readKibanaMock } from '../../common/lib/kibana/__mocks__';
import { useKibana } from '../../common/lib/kibana';
import { TestProviders } from '../../common/mock';
import {
  SiemReadinessHeader,
  CONFIGURATIONS_MENU_ITEM_TEST_ID,
  TECHNICAL_PREVIEW_BADGE_TEST_ID,
} from './siem_readiness_header';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/components/app_header/use_ml_job_settings_menu_item', () => ({
  useMlJobSettingsMenuItem: () => ({ item: undefined, flyout: null }),
}));
jest.mock('../../common/hooks/use_add_integrations_url', () => ({
  useAddIntegrationsUrl: () => ({ href: '/app/integrations/browse', onClick: jest.fn() }),
}));

const DOC_HREF = 'https://www.elastic.co/docs/solutions/security';

const baseServices = readKibanaMock().services;

const renderHeader = (onConfigurationsSave = jest.fn()) =>
  render(
    <MemoryRouter initialEntries={['/siem_readiness/visibility/coverage']}>
      <TestProviders>
        <SiemReadinessHeader onConfigurationsSave={onConfigurationsSave} />
      </TestProviders>
    </MemoryRouter>
  );

describe('SiemReadinessHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        ...baseServices,
        docLinks: {
          ...baseServices.docLinks,
          links: {
            ...baseServices.docLinks.links,
            siem: { ...baseServices.docLinks.links.siem, guide: DOC_HREF },
          },
        },
      },
    });
  });

  it('renders the page title and the technical preview badge', () => {
    renderHeader();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('SIEM Readiness');
    expect(screen.getByTestId(TECHNICAL_PREVIEW_BADGE_TEST_ID)).toHaveTextContent(
      /technical preview/i
    );
  });

  it('opens the configuration modal from the app menu', async () => {
    renderHeader();
    await openAppMenuOverflow();

    expect(screen.queryByText('Category applicability')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId(CONFIGURATIONS_MENU_ITEM_TEST_ID));

    expect(screen.getByText('Category applicability')).toBeInTheDocument();
  });

  it('notifies the page when the configuration modal saves', async () => {
    const onConfigurationsSave = jest.fn();
    renderHeader(onConfigurationsSave);
    await openAppMenuOverflow();

    await userEvent.click(screen.getByTestId(CONFIGURATIONS_MENU_ITEM_TEST_ID));
    await userEvent.click(screen.getByTestId('configurationModalSaveButton'));

    expect(onConfigurationsSave).toHaveBeenCalledWith(expect.any(Array));
    expect(screen.queryByText('Category applicability')).not.toBeInTheDocument();
  });

  it('exposes the SIEM documentation link in the app menu overflow', async () => {
    renderHeader();
    await openAppMenuOverflow();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.menuDocumentation)).toHaveAttribute(
      'href',
      DOC_HREF
    );
  });
});
