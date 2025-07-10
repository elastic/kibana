/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SiemMigrationStartUpsellSection } from './siem_migrations_start';

describe('SiemMigrationStartUpsellSection', () => {
  it('should render the component with all sections correctly', () => {
    render(
      <SiemMigrationStartUpsellSection
        title="title"
        upgradeMessage="upgradeMessage"
        upgradeHref="https://upgrade.Href"
      />
    );

    expect(screen.getByTestId('siemMigrationStartUpsellSection')).toBeVisible();

    expect(screen.getByTestId('siemMigrationStartUpsellTitle')).toBeVisible();
    expect(screen.getByTestId('siemMigrationStartUpsellTitle')).toHaveTextContent('title');

    expect(screen.getByTestId('siemMigrationStartUpsellMessage')).toBeVisible();
    expect(screen.getByTestId('siemMigrationStartUpsellMessage')).toHaveTextContent(
      'upgradeMessage'
    );

    expect(screen.getByTestId('siemMigrationStartUpsellHref')).toBeVisible();
    expect(screen.getByTestId('siemMigrationStartUpsellHref')).toHaveAttribute(
      'href',
      'https://upgrade.Href'
    );
  });

  it('should render the component without upgradeHref', () => {
    render(<SiemMigrationStartUpsellSection title="title" upgradeMessage="upgradeMessage" />);

    expect(screen.queryByTestId('SiemMigrationStartUpsellHref')).not.toBeInTheDocument();
  });
});
