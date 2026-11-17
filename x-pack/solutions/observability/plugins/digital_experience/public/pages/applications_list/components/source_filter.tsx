/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { APPLICATION_SOURCE } from '../../../../common/application_source';
import type { ApplicationSource } from '../../../../common/types/applications';
import { SOURCE_LABELS } from '../../../labels';
import { applicationSourceRt } from '../../../utils/application_source';
import { APPLICATIONS_LIST_EBT_ELEMENTS } from '../../../ebt_constants';
import { SingleSelectFilter } from '../../../components/single_select_filter';

const SOURCE_LABEL = i18n.translate('xpack.digitalExperience.sourceFilter.label', {
  defaultMessage: 'Source',
});

const ALL_SOURCES = 'all';

const OPTIONS = [
  {
    value: ALL_SOURCES,
    label: i18n.translate('xpack.digitalExperience.sourceFilter.all', {
      defaultMessage: 'All sources',
    }),
  },
  { value: APPLICATION_SOURCE.otel, label: SOURCE_LABELS.otel },
  { value: APPLICATION_SOURCE.classic, label: SOURCE_LABELS.classic },
];

/** Source filter: EDOT Browser, Classic RUM or both (`undefined`). */
export function SourceFilter({
  selected,
  onChange,
}: {
  selected: ApplicationSource | undefined;
  onChange: (source: ApplicationSource | undefined) => void;
}) {
  return (
    <SingleSelectFilter
      data-test-subj="digitalExperienceSourceFilter"
      ebtElement={APPLICATIONS_LIST_EBT_ELEMENTS.SOURCE_FILTER}
      label={SOURCE_LABEL}
      options={OPTIONS}
      selected={selected ?? ALL_SOURCES}
      isActive={selected !== undefined}
      onChange={(value) => onChange(applicationSourceRt.is(value) ? value : undefined)}
    />
  );
}
