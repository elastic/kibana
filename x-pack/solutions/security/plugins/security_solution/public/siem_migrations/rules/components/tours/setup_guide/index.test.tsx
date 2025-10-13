/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react';
import { SiemMigrationSetupTour } from '.';
import * as i18n from './translations';

const mockUseKibana = {
  services: {
    storage: {
      get: jest.fn().mockReturnValue(null),
      set: jest.fn(),
    },
    siemMigrations: {
      rules: {
        isAvailable: jest.fn().mockReturnValue(true),
      },
    },
  },
};

jest.mock('../../../../../common/lib/kibana', () => ({
  useKibana: () => mockUseKibana,
}));

describe('SiemMigrationSetupTour', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('does not render the tour step immediately', () => {
    const { queryByTestId, queryByText } = render(
      <SiemMigrationSetupTour>
        <div />
      </SiemMigrationSetupTour>
    );
    expect(queryByText(i18n.SETUP_SIEM_MIGRATION_TOUR_TITLE)).not.toBeInTheDocument();
    expect(queryByText(i18n.SETUP_SIEM_MIGRATION_TOUR_CONTENT)).not.toBeInTheDocument();
    expect(queryByTestId('finishTourButton')).not.toBeInTheDocument();
  });

  it('renders the tour step after a delay', async () => {
    const { queryByTestId, queryByText } = render(
      <SiemMigrationSetupTour>
        <div />
      </SiemMigrationSetupTour>
    );

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(queryByText(i18n.SETUP_SIEM_MIGRATION_TOUR_TITLE)).toBeInTheDocument();
      expect(queryByText(i18n.SETUP_SIEM_MIGRATION_TOUR_CONTENT)).toBeInTheDocument();
      expect(queryByTestId('finishTourButton')).toBeInTheDocument();
    });
  });

  it('hides the tour when the finish button is clicked', async () => {
    const { queryByTestId, getByTestId, queryByText } = render(
      <SiemMigrationSetupTour>
        <div />
      </SiemMigrationSetupTour>
    );

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(queryByText(i18n.SETUP_SIEM_MIGRATION_TOUR_TITLE)).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(getByTestId('finishTourButton'));
    });

    await waitFor(() => {
      expect(queryByText(i18n.SETUP_SIEM_MIGRATION_TOUR_TITLE)).not.toBeInTheDocument();
      expect(queryByText(i18n.SETUP_SIEM_MIGRATION_TOUR_CONTENT)).not.toBeInTheDocument();
      expect(queryByTestId('finishTourButton')).not.toBeInTheDocument();
    });
  });

  it('does not render if siemMigrations.rules.isAvailable() is false', async () => {
    mockUseKibana.services.siemMigrations.rules.isAvailable.mockReturnValue(false);
    const { queryByTestId, queryByText } = render(
      <SiemMigrationSetupTour>
        <div />
      </SiemMigrationSetupTour>
    );

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(queryByText(i18n.SETUP_SIEM_MIGRATION_TOUR_TITLE)).not.toBeInTheDocument();
    expect(queryByText(i18n.SETUP_SIEM_MIGRATION_TOUR_CONTENT)).not.toBeInTheDocument();
    expect(queryByTestId('finishTourButton')).not.toBeInTheDocument();
  });

  it('does not render if the tour has already been completed', async () => {
    mockUseKibana.services.storage.get.mockReturnValue({ isTourActive: false });
    const { queryByTestId, queryByText } = render(
      <SiemMigrationSetupTour>
        <div />
      </SiemMigrationSetupTour>
    );

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(queryByText(i18n.SETUP_SIEM_MIGRATION_TOUR_TITLE)).not.toBeInTheDocument();
    expect(queryByText(i18n.SETUP_SIEM_MIGRATION_TOUR_CONTENT)).not.toBeInTheDocument();
    expect(queryByTestId('finishTourButton')).not.toBeInTheDocument();
  });
});
