/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MigrationTranslationResult } from '../../../../../common/siem_migrations/constants';
import { StatusFilterBase } from '../../types';
import { convertTranslationResultIntoText } from '../../utils';
import * as i18n from './translations';
import type { StatusFilterOptions } from './types';

export const statusFilterBaseOptions: StatusFilterOptions<StatusFilterBase>[] = [
  {
    label: i18n.INSTALL_FILTER_OPTION,
    data: { status: StatusFilterBase.INSTALLED },
  },
  {
    label: convertTranslationResultIntoText(MigrationTranslationResult.FULL),
    data: { status: StatusFilterBase.TRANSLATED },
  },
  {
    label: convertTranslationResultIntoText(MigrationTranslationResult.PARTIAL),
    data: { status: StatusFilterBase.PARTIALLY_TRANSLATED },
  },
  {
    label: convertTranslationResultIntoText(MigrationTranslationResult.UNTRANSLATABLE),
    data: { status: StatusFilterBase.UNTRANSLATABLE },
  },
  {
    label: i18n.FAILED_FILTER_OPTION,
    data: { status: StatusFilterBase.FAILED },
  },
];
