/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, EuiExpression, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { memo, useMemo } from 'react';
import type { OsType } from '@kbn/securitysolution-io-ts-list-types';
import type { CriteriaConditionsProps } from '../../../../components/artifact_entry_card/components/criteria_conditions';
import {
  CONDITION_OPERATOR_TYPE_MATCH,
  CONDITION_OS,
  OS_LINUX,
  OS_MAC,
  OS_WINDOWS,
} from '../../../../components/artifact_entry_card/components/translations';
import { useTestIdGenerator } from '../../../../hooks/use_test_id_generator';

const OS_LABELS: Readonly<Record<OsType, string>> = {
  linux: OS_LINUX,
  macos: OS_MAC,
  windows: OS_WINDOWS,
};

const YARA_RULE_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.customYaraSignatures.criteria.ruleAriaLabel',
  { defaultMessage: 'YARA rule' }
);

/**
 * Policy-card criteria for a custom YARA signature: operating systems and the rule source.
 */
export const CustomYaraSignatureCriteria = memo<CriteriaConditionsProps>(
  ({ os, entries, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const osLabel = useMemo(() => os.map((osValue) => OS_LABELS[osValue]).join(', '), [os]);
    const rule = useMemo(() => entries[0]?.value ?? '', [entries]);

    return (
      <div data-test-subj={dataTestSubj}>
        <div data-test-subj={getTestId('os')}>
          <strong>
            <EuiExpression description={''} value={CONDITION_OS} />
            <EuiExpression description={CONDITION_OPERATOR_TYPE_MATCH} value={osLabel} />
          </strong>
        </div>
        <EuiSpacer size="s" />

        <EuiCodeBlock
          paddingSize="s"
          fontSize="s"
          overflowHeight={240}
          aria-label={YARA_RULE_ARIA_LABEL}
          data-test-subj={getTestId('rule')}
        >
          {rule}
        </EuiCodeBlock>
      </div>
    );
  }
);
CustomYaraSignatureCriteria.displayName = 'CustomYaraSignatureCriteria';
