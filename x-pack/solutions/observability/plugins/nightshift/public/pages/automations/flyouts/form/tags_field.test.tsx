/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { AutomationTagsField } from './tags_field';

const TagsField = () => {
  const [tags, setTags] = useState<string[]>([]);
  return (
    <I18nProvider>
      <AutomationTagsField tags={tags} suggestions={['alerts']} onChange={setTags} />
    </I18nProvider>
  );
};

const addTag = (tag: string) => {
  const input = within(screen.getByTestId('automationTagInput')).getByRole('combobox');
  fireEvent.change(input, { target: { value: tag } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

const selectedTags = () =>
  screen.queryAllByTestId('euiComboBoxPill').map((pill) => pill.textContent);

describe('AutomationTagsField', () => {
  it('ignores duplicate tags and removes tags', () => {
    render(<TagsField />);
    addTag('oncall');
    addTag('OnCall');

    expect(selectedTags()).toEqual(['oncall']);
    fireEvent.click(screen.getByLabelText(/Remove oncall/));
    expect(selectedTags()).toEqual([]);
  });

  it('trims tags to 32 characters', () => {
    render(<TagsField />);
    addTag(`  ${'a'.repeat(40)}  `);

    expect(selectedTags()).toEqual(['a'.repeat(32)]);
  });
});
