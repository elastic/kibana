/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AllFieldsDiff } from '../../../../../common/api/detection_engine';

export interface FieldDiff {
  currentVersion: string;
  targetVersion: string;
  fieldName: string;
}
export interface FormattedFieldDiff {
  shouldShowSubtitles: boolean;
  fieldDiffs: FieldDiff[];
}

export interface FieldsGroupDiff {
  formattedDiffs: FormattedFieldDiff;
  fieldsGroupName: keyof AllFieldsDiff;
}
