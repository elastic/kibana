/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TranslationCallOut } from './callout';
import { type RuleMigrationRule } from '../../../../../../../common/siem_migrations/model/rule_migration.gen';

describe('TranslationCallOut', () => {
  const mockRule = {
    translation_result: 'full',
  } as unknown as RuleMigrationRule;

  it('renders correctly for "mapped" mode', () => {
    const mappedRule = {
      ...mockRule,
      elastic_rule: { prebuilt_rule_id: '1' },
    } as unknown as RuleMigrationRule;
    const { getByTestId } = render(<TranslationCallOut migrationRule={mappedRule} />);
    expect(getByTestId('ruleMigrationCallOut-mapped')).toBeInTheDocument();
    expect(getByTestId('ruleMigrationCallOut-mapped')).toHaveTextContent(
      'This rule was mapped to an Elastic authored rule. Click Install & enable rule to complete migration. You can fine-tune it later.'
    );
  });

  it('renders correctly for "full" mode', () => {
    const { getByTestId } = render(<TranslationCallOut migrationRule={mockRule} />);
    expect(getByTestId('ruleMigrationCallOut-full')).toBeInTheDocument();
    expect(getByTestId('ruleMigrationCallOut-full')).toHaveTextContent(
      'This rule has been fully translated. Install rule to finish migration. Once installed, you’ll be able to fine tune the rule.'
    );
  });

  it('renders correctly for "partial" mode', () => {
    const partialRule = {
      ...mockRule,
      translation_result: 'partial',
    } as unknown as RuleMigrationRule;
    const { getByTestId } = render(<TranslationCallOut migrationRule={partialRule} />);
    expect(getByTestId('ruleMigrationCallOut-partial')).toBeInTheDocument();
    expect(getByTestId('ruleMigrationCallOut-partial')).toHaveTextContent(
      'Part of the query could not be translated.To save this rule, finish writing the query. If you need help, please contact Elastic support.'
    );
  });

  it('renders correctly for "untranslatable" mode', () => {
    const untranslatableRule = {
      ...mockRule,
      translation_result: 'untranslatable',
    } as unknown as RuleMigrationRule;
    const { getByTestId } = render(<TranslationCallOut migrationRule={untranslatableRule} />);
    expect(getByTestId('ruleMigrationCallOut-untranslatable')).toBeInTheDocument();
    expect(getByTestId('ruleMigrationCallOut-untranslatable')).toHaveTextContent(
      'This query couldn’t be translated.This might be caused by feature differences between SIEM products. If possible, update the rule manually.'
    );
  });
});
