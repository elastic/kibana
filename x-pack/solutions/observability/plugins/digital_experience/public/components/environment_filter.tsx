/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { ENVIRONMENT_ALL_VALUE, getEnvironmentLabel } from '@kbn/apm-types';
import { DIGITAL_EXPERIENCE_EBT_ELEMENTS } from '../ebt_constants';
import { SingleSelectFilter } from './single_select_filter';

const ENVIRONMENT_LABEL = i18n.translate('xpack.digitalExperience.environmentFilter.label', {
  defaultMessage: 'Environment',
});

/**
 * Environment filter with APM's "All" and "Not defined" entries (`undefined` is all), which keeps
 * the selected environment listed even when the time range has no data for it.
 */
export function EnvironmentFilter({
  environments,
  selected,
  onChange,
  isLoading,
}: {
  environments: string[];
  selected: string | undefined;
  onChange: (environment: string | undefined) => void;
  isLoading: boolean;
}) {
  const options = useMemo(() => {
    const values =
      selected && !environments.includes(selected) ? [selected, ...environments] : environments;
    return [ENVIRONMENT_ALL_VALUE, ...values].map((value) => ({
      value,
      label: getEnvironmentLabel(value),
    }));
  }, [environments, selected]);

  return (
    <SingleSelectFilter
      data-test-subj="digitalExperienceEnvironmentFilter"
      ebtElement={DIGITAL_EXPERIENCE_EBT_ELEMENTS.ENVIRONMENT_FILTER}
      label={ENVIRONMENT_LABEL}
      options={options}
      selected={selected ?? ENVIRONMENT_ALL_VALUE}
      isActive={selected !== undefined}
      onChange={(value) => onChange(value === ENVIRONMENT_ALL_VALUE ? undefined : value)}
      searchable
      isLoading={isLoading}
    />
  );
}
