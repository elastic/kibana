/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { capitalize } from 'lodash/fp';
import { i18n } from '@kbn/i18n';
import { ENTITY_STORE_PROBLEMS_TEST_ID } from '../../../../../test_ids';
import type { EngineProblem } from '../helpers';

/** Every failing task or missing resource in one place, so nobody has to open each table. */
export const ProblemsCallout = ({ problems }: { problems: EngineProblem[] }) => {
  if (problems.length === 0) {
    return null;
  }

  return (
    <KbnDangerCallout
      announceOnMount
      data-test-subj={ENTITY_STORE_PROBLEMS_TEST_ID}
      title={i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.problems.title', {
        defaultMessage: '{count, plural, one {# problem} other {# problems}}',
        values: { count: problems.length },
      })}
      text={
        <EuiText size="s">
          <ul>
            {problems.map(({ entityType, source, message }) => (
              <li key={`${entityType}-${source}-${message}`}>
                <strong>{`${capitalize(entityType)} · ${source}`}</strong>
                {`: ${message}`}
              </li>
            ))}
          </ul>
        </EuiText>
      }
    />
  );
};
