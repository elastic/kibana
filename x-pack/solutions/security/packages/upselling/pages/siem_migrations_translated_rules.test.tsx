/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { SiemMigrationsTranslatedRulesUpsellPage } from './siem_migrations_translated_rules';
import { SIEM_MIGRATION_UPSELLING_PAGE_TITLE } from './translations';

const renderPage = (
  props: Partial<React.ComponentProps<typeof SiemMigrationsTranslatedRulesUpsellPage>>
) =>
  render(
    <MockAppHeaderProvider>
      <SiemMigrationsTranslatedRulesUpsellPage
        title="title"
        upgradeMessage="upgradeMessage"
        {...props}
      />
    </MockAppHeaderProvider>
  );

describe('SiemMigrationsTranslatedRulesUpsellPage', () => {
  it('should render the component with all sections correctly', () => {
    renderPage({ upgradeHref: 'https://upgrade.Href' });

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      SIEM_MIGRATION_UPSELLING_PAGE_TITLE
    );

    expect(screen.getByTestId('siemMigrationTranslatedRulesUpsellTitle')).toBeVisible();
    expect(screen.getByTestId('siemMigrationTranslatedRulesUpsellTitle')).toHaveTextContent(
      'title'
    );

    expect(screen.getByTestId('siemMigrationTranslatedRulesUpsellUpgradeMessage')).toBeVisible();
    expect(
      screen.getByTestId('siemMigrationTranslatedRulesUpsellUpgradeMessage')
    ).toHaveTextContent('upgradeMessage');

    expect(screen.getByTestId('siemMigrationTranslatedRulesUpsellButton')).toBeVisible();
    expect(screen.getByTestId('siemMigrationTranslatedRulesUpsellButton')).toHaveAttribute(
      'href',
      'https://upgrade.Href'
    );
  });

  it('should render the component without upgradeHref', () => {
    renderPage({});

    expect(
      screen.queryByTestId('siemMigrationTranslatedRulesUpsellButton')
    ).not.toBeInTheDocument();
  });

  it('should render the documentation link in the app header menu', async () => {
    const docLink = 'https://www.elastic.co/docs/siem-migrations';
    renderPage({ docLink });

    await openAppMenuOverflow();

    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.menuDocumentation)).toHaveAttribute(
      'href',
      docLink
    );
  });
});
