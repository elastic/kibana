/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import type { RuleLibrary } from '../../../../../common/api/detection_engine/model/rule_schema';
import {
  COMMUNITY_LIBRARY_BADGE,
  ELASTIC_LIBRARY_BADGE,
  RULE_LIBRARY_TOOLTIP,
} from './translations';

export { RULE_LIBRARY_TOOLTIP };

export const ruleLibraryBadgeLabel = (library: Pick<RuleLibrary, 'id' | 'title'>): string => {
  if (library.id === 'elastic') {
    return ELASTIC_LIBRARY_BADGE;
  }
  if (library.id === 'elastic-community') {
    return COMMUNITY_LIBRARY_BADGE;
  }
  return library.title;
};

export const RuleLibraryBadge = ({ library }: { library: RuleLibrary }) => (
  <EuiToolTip content={RULE_LIBRARY_TOOLTIP(library.title)}>
    <EuiBadge color="hollow" iconType={library.icon} tabIndex={0} data-test-subj="ruleLibraryBadge">
      {ruleLibraryBadgeLabel(library)}
    </EuiBadge>
  </EuiToolTip>
);
