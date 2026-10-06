/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const MAX_TAG_LENGTH = 32;

export const tagLabels = {
  tags: i18n.translate('xpack.nightshift.automations.flyout.tagsLabel', {
    defaultMessage: 'Tags',
  }),
  addTags: i18n.translate('xpack.nightshift.automations.flyout.addTags', {
    defaultMessage: 'Add tags',
  }),
  addTagOption: i18n.translate('xpack.nightshift.automations.flyout.addTagOption', {
    defaultMessage: 'Add {searchValue} as a tag',
    values: { searchValue: '{searchValue}' },
  }),
};

export const AutomationTagsField = ({
  tags,
  suggestions,
  onChange,
}: {
  tags: string[];
  suggestions: string[];
  onChange: (tags: string[]) => void;
}) => {
  const addTag = (tag: string) => {
    const trimmed = tag.trim().slice(0, MAX_TAG_LENGTH);
    if (trimmed && !tags.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...tags, trimmed]);
    }
  };

  return (
    <EuiComboBox
      fullWidth
      compressed
      aria-label={tagLabels.tags}
      placeholder={tagLabels.addTags}
      customOptionText={tagLabels.addTagOption}
      options={suggestions.map((label) => ({ label }))}
      selectedOptions={tags.map((label) => ({ label }))}
      onCreateOption={addTag}
      onChange={(selected) => onChange(selected.map(({ label }) => label))}
      inputRef={(input) => input?.setAttribute('maxLength', String(MAX_TAG_LENGTH))}
      data-test-subj="automationTagInput"
    />
  );
};
