/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { CUSTOM_YARA_SIGNATURE_FIELD_TYPE } from '../../../../../../common/endpoint/service/artifacts/constants';
import type { ArtifactViewModeComponentProps } from '../../../../components/artifact_list_page';
import { YaraCodeEditor } from './yara_code_editor';
import { SIGNATURE_EDITOR_ARIA_LABEL } from './translations';

const getCustomYaraSignatureValue = (item: ExceptionListItemSchema): string => {
  const entry = item.entries[0];

  if (
    entry &&
    'field' in entry &&
    entry.field === CUSTOM_YARA_SIGNATURE_FIELD_TYPE &&
    'value' in entry &&
    typeof entry.value === 'string'
  ) {
    return entry.value;
  }

  return '';
};

export const CustomYaraSignaturesViewMode = memo<ArtifactViewModeComponentProps>(({ item }) => (
  <YaraCodeEditor
    value={getCustomYaraSignatureValue(item)}
    readOnly
    isCopyable
    maxLines={17}
    aria-label={SIGNATURE_EDITOR_ARIA_LABEL}
    data-test-subj="customYaraSignaturesViewMode"
  />
));
CustomYaraSignaturesViewMode.displayName = 'CustomYaraSignaturesViewMode';
