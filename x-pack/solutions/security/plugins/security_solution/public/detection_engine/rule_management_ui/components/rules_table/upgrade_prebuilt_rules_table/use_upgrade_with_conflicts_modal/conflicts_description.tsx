/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import React from 'react';
import * as i18n from './translations';

export interface RulesConflictStats {
  numOfRulesWithoutConflicts: number;
  numOfRulesWithSolvableConflicts: number;
  numOfRulesWithNonSolvableConflicts: number;
}

export function ConflictsDescription({
  numOfRulesWithoutConflicts,
  numOfRulesWithSolvableConflicts,
  numOfRulesWithNonSolvableConflicts,
}: RulesConflictStats): JSX.Element {
  return (
    <EuiText>
      <p>
        {numOfRulesWithNonSolvableConflicts > 0 && (
          <>
            {i18n.RULES_WITH_NON_SOLVABLE_CONFLICTS_TOTAL(numOfRulesWithNonSolvableConflicts)}
            <br />
          </>
        )}
        {numOfRulesWithSolvableConflicts > 0 && (
          <>
            {i18n.RULES_WITH_SOLVABLE_CONFLICTS_TOTAL(numOfRulesWithSolvableConflicts)}
            <br />
          </>
        )}
        {numOfRulesWithoutConflicts > 0 && (
          <>
            {i18n.RULES_WITHOUT_CONFLICTS_TOTAL(numOfRulesWithoutConflicts)}
            <br />
          </>
        )}
      </p>
      {numOfRulesWithNonSolvableConflicts > 0 && (
        <p>{i18n.RULES_WITH_NON_SOLVABLE_CONFLICTS_GUIDANCE(numOfRulesWithNonSolvableConflicts)}</p>
      )}
      {numOfRulesWithSolvableConflicts > 0 &&
        i18n.RULES_WITH_AUTO_RESOLVED_CONFLICTS_GUIDANCE({
          numOfRulesWithSolvableConflicts,
          numOfRulesWithoutConflicts,
        })}
      {numOfRulesWithoutConflicts > 0 && (
        <p>{i18n.RULES_WITHOUT_CONFLICTS_GUIDANCE(numOfRulesWithoutConflicts)}</p>
      )}
    </EuiText>
  );
}
