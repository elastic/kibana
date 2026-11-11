/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { DEFAULT_PREVIEW_INDEX } from '../../../../common/constants';

/**
 * Returns true when the document lives in a preview alerts index.
 *
 * Preview alerts are created transiently while the user is editing a rule and
 * are stored under `.internal.preview.alerts-security.alerts-<space>` (accessed
 * via the `.preview.alerts-security.alerts-<space>` alias). Either form is
 * matched because `DEFAULT_PREVIEW_INDEX` (`.preview.alerts-security.alerts`)
 * is a substring of both.
 *
 */
export const isRulePreviewDocument = (hit: DataTableRecord): boolean =>
  ((hit.raw._index as string) ?? (getFieldValue(hit, '_index') as string) ?? '').includes(
    DEFAULT_PREVIEW_INDEX
  );
