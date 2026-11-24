/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { WorkflowMigrationWorkflow } from '../../../../../common/siem_migrations/model/workflow_migration.gen';
import { TestProviders } from '../../../../common/mock';
import type { FlyoutPrevNextNavigation } from '../../../../common/flyout_prev_next_nav';
import { WorkflowMigrationDetailsFlyout } from '.';

const getNavigation = (
  overrides: Partial<FlyoutPrevNextNavigation> = {}
): FlyoutPrevNextNavigation => ({
  hasNext: true,
  hasPrevious: true,
  goToNext: jest.fn(),
  goToPrevious: jest.fn(),
  ...overrides,
});

const getWorkflow = (overrides: Partial<WorkflowMigrationWorkflow> = {}) =>
  ({
    id: 'item-1',
    '@timestamp': '2024-06-01T12:00:00Z',
    migration_id: 'migration-1',
    created_by: 'user1',
    original_workflow: {
      id: 'story-1',
      vendor: 'tines',
      title: 'Phishing triage',
      description: 'Triages reported phishing emails',
      data: '{}',
      format: 'json',
    },
    status: 'completed',
    translation_result: 'full',
    ...overrides,
  } as WorkflowMigrationWorkflow);

const renderFlyout = (
  props: Partial<React.ComponentProps<typeof WorkflowMigrationDetailsFlyout>> = {}
) =>
  render(
    <WorkflowMigrationDetailsFlyout
      migrationWorkflow={getWorkflow()}
      closeFlyout={jest.fn()}
      navigation={getNavigation()}
      {...props}
    />,
    { wrapper: TestProviders }
  );

describe('WorkflowMigrationDetailsFlyout', () => {
  it('should show the title of the workflow', () => {
    renderFlyout();

    expect(screen.getByTestId('detailsFlyoutTitle')).toHaveTextContent('Phishing triage');
  });

  it('should prefer the title of the translated workflow', () => {
    renderFlyout({
      migrationWorkflow: getWorkflow({
        elastic_workflow: { id: 'elastic-1', title: 'Phishing triage elastic' },
      }),
    });

    expect(screen.getByTestId('detailsFlyoutTitle')).toHaveTextContent('Phishing triage elastic');
  });

  describe('description', () => {
    it('should show the description of the workflow', () => {
      renderFlyout();

      expect(screen.getByTestId('detailsFlyoutDescription')).toHaveTextContent(
        'Triages reported phishing emails'
      );
    });

    it('should prefer the description of the translated workflow', () => {
      renderFlyout({
        migrationWorkflow: getWorkflow({
          elastic_workflow: {
            id: 'elastic-1',
            title: 'Phishing triage elastic',
            description: 'Triages reported phishing emails in Elastic',
          },
        }),
      });

      expect(screen.getByTestId('detailsFlyoutDescription')).toHaveTextContent(
        'Triages reported phishing emails in Elastic'
      );
    });

    it('should not show a description when the workflow has none', () => {
      renderFlyout({
        migrationWorkflow: getWorkflow({
          original_workflow: {
            id: 'story-1',
            vendor: 'tines',
            title: 'Phishing triage',
            data: '{}',
            format: 'json',
          },
        }),
      });

      expect(screen.queryByTestId('detailsFlyoutDescription')).not.toBeInTheDocument();
    });

    it('should show the description below the last updated line', () => {
      renderFlyout();

      const description = screen.getByTestId('detailsFlyoutDescription');
      const title = screen.getByTestId('detailsFlyoutTitle');

      expect(title.compareDocumentPosition(description)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
  });

  it('should show the Translation and the Summary tabs', () => {
    renderFlyout();

    expect(screen.getByTestId('tabTranslation')).toHaveTextContent('Translation');
    expect(screen.getByTestId('tabSummary')).toHaveTextContent('Summary');
  });

  it('should open on the Translation tab', () => {
    renderFlyout();

    expect(screen.getByTestId('tabTranslation')).toHaveAttribute('aria-selected', 'true');
  });

  it('should switch to the Summary tab when it is clicked', () => {
    renderFlyout();

    fireEvent.click(screen.getByTestId('tabSummary'));

    expect(screen.getByTestId('tabSummary')).toHaveAttribute('aria-selected', 'true');
  });

  it('should close when the close button is clicked', () => {
    const closeFlyout = jest.fn();
    renderFlyout({ closeFlyout });

    fireEvent.click(screen.getByTestId('detailsFlyoutCloseButton'));

    expect(closeFlyout).toHaveBeenCalled();
  });

  describe('navigation', () => {
    it('should go to the next workflow when the next button is clicked', () => {
      const navigation = getNavigation();
      renderFlyout({ navigation });

      fireEvent.click(screen.getByTestId('flyoutPrevNextNavNextButton'));

      expect(navigation.goToNext).toHaveBeenCalled();
    });

    it('should go to the previous workflow when the previous button is clicked', () => {
      const navigation = getNavigation();
      renderFlyout({ navigation });

      fireEvent.click(screen.getByTestId('flyoutPrevNextNavPreviousButton'));

      expect(navigation.goToPrevious).toHaveBeenCalled();
    });

    it('should disable the previous button on the first workflow', () => {
      renderFlyout({ navigation: getNavigation({ hasPrevious: false }) });

      expect(screen.getByTestId('flyoutPrevNextNavPreviousButton')).toBeDisabled();
    });

    it('should disable the next button on the last workflow', () => {
      renderFlyout({ navigation: getNavigation({ hasNext: false }) });

      expect(screen.getByTestId('flyoutPrevNextNavNextButton')).toBeDisabled();
    });
  });
});
