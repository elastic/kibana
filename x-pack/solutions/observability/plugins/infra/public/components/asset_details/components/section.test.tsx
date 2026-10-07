/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { Section } from './section';

const SECTION_TEST_SUBJ = 'infraAssetDetailsMetadataCollapsible';
const COLLAPSE_EXPAND_TEST_SUBJ = 'infraAssetDetailsCollapseExpandSection';

const renderSection = (props: Partial<React.ComponentProps<typeof Section>> = {}) =>
  render(
    <I18nProvider>
      <Section
        title={<span>Metadata</span>}
        data-test-subj={SECTION_TEST_SUBJ}
        id="metadata"
        {...props}
      >
        <div>section content</div>
      </Section>
    </I18nProvider>
  );

describe('Section', () => {
  describe('collapsible', () => {
    it('renders expanded content by default', () => {
      renderSection({ collapsible: true });

      expect(screen.getByTestId(COLLAPSE_EXPAND_TEST_SUBJ)).toHaveAttribute(
        'data-section-state',
        'open'
      );
      expect(screen.getByText('section content')).toBeInTheDocument();
    });

    it('collapses content when the section button is clicked', async () => {
      renderSection({ collapsible: true });

      await userEvent.click(screen.getByTestId(SECTION_TEST_SUBJ));

      expect(screen.getByTestId(COLLAPSE_EXPAND_TEST_SUBJ)).toHaveAttribute(
        'data-section-state',
        'closed'
      );
    });

    it('expands content again on a second click', async () => {
      renderSection({ collapsible: true });

      const sectionButton = screen.getByTestId(SECTION_TEST_SUBJ);
      await userEvent.click(sectionButton);
      await userEvent.click(sectionButton);

      expect(screen.getByTestId(COLLAPSE_EXPAND_TEST_SUBJ)).toHaveAttribute(
        'data-section-state',
        'open'
      );
    });

    it('starts collapsed when initialTriggerValue is closed', () => {
      renderSection({ collapsible: true, initialTriggerValue: 'closed' });

      expect(screen.getByTestId(COLLAPSE_EXPAND_TEST_SUBJ)).toHaveAttribute(
        'data-section-state',
        'closed'
      );
    });

    it('keeps the extra action reachable while collapsed', async () => {
      renderSection({
        collapsible: true,
        extraAction: <button type="button">Show all</button>,
      });

      await userEvent.click(screen.getByTestId(SECTION_TEST_SUBJ));

      expect(screen.getByRole('button', { name: 'Show all' })).toBeVisible();
    });

    it('shows the closed section content only while collapsed', async () => {
      renderSection({
        collapsible: true,
        closedSectionContent: <span>2 active alerts</span>,
      });

      expect(screen.queryByText('2 active alerts')).not.toBeInTheDocument();

      await userEvent.click(screen.getByTestId(SECTION_TEST_SUBJ));

      expect(screen.getByText('2 active alerts')).toBeInTheDocument();
    });
  });

  describe('non-collapsible', () => {
    it('renders content without a collapse control', () => {
      renderSection();

      expect(screen.queryByTestId(COLLAPSE_EXPAND_TEST_SUBJ)).not.toBeInTheDocument();
      expect(screen.getByTestId(SECTION_TEST_SUBJ)).toBeInTheDocument();
      expect(screen.getByText('section content')).toBeInTheDocument();
    });

    it('renders the extra action next to the title', () => {
      renderSection({ extraAction: <button type="button">Show all</button> });

      expect(screen.getByRole('button', { name: 'Show all' })).toBeVisible();
    });
  });
});
