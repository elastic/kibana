/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { MOBILE_PLATFORMS } from '../../../../common/types/applications';
import type { MobilePlatform } from '../../../../common/types/applications';
import { PLATFORM_LABELS } from '../../../labels';
import { mobilePlatformRt } from '../../../utils/application_source';
import { APPLICATIONS_LIST_EBT_ELEMENTS } from '../../../ebt_constants';
import { SingleSelectFilter } from '../../../components/single_select_filter';

const PLATFORM_LABEL = i18n.translate('xpack.digitalExperience.platformFilter.label', {
  defaultMessage: 'Platform',
});

const ALL_PLATFORMS = 'all';

const OPTIONS = [
  {
    value: ALL_PLATFORMS,
    label: i18n.translate('xpack.digitalExperience.platformFilter.all', {
      defaultMessage: 'All platforms',
    }),
  },
  ...MOBILE_PLATFORMS.map((platform) => ({
    value: platform,
    label: PLATFORM_LABELS[platform],
  })),
];

/** The mobile applications' platform filter: Android, iOS or all (`undefined`). */
export function PlatformFilter({
  selected,
  onChange,
}: {
  selected: MobilePlatform | undefined;
  onChange: (platform: MobilePlatform | undefined) => void;
}) {
  return (
    <SingleSelectFilter
      data-test-subj="digitalExperiencePlatformFilter"
      ebtElement={APPLICATIONS_LIST_EBT_ELEMENTS.PLATFORM_FILTER}
      label={PLATFORM_LABEL}
      options={OPTIONS}
      selected={selected ?? ALL_PLATFORMS}
      isActive={selected !== undefined}
      onChange={(value) => onChange(mobilePlatformRt.is(value) ? value : undefined)}
    />
  );
}
