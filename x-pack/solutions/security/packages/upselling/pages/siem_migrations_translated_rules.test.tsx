/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SiemMigrationsTranslatedRulesUpsellPage } from './siem_migrations_translated_rules';
import { render, screen } from '@testing-library/react';

describe('SiemMigrationsTranslatedRulesUpsellPage', () => {
  it('should render the component with all sections correctly', () => {
    render(
      <SiemMigrationsTranslatedRulesUpsellPage
        title="title"
        upgradeMessage="upgradeMessage"
        upgradeHref="https://upgrade.Href"
      />
    );

    expect(screen.getByTestId('siemMigrationTranslatedRulesUpsellButton')).toBeVisible();

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
    render(
      <SiemMigrationsTranslatedRulesUpsellPage title="title" upgradeMessage="upgradeMessage" />
    );

    expect(
      screen.queryByTestId('siemMigrationTranslatedRulesUpsellButton')
    ).not.toBeInTheDocument();
  });
});
