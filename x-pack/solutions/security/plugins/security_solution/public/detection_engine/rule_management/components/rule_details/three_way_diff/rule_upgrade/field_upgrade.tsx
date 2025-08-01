/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { snakeCase } from 'lodash';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { SplitAccordion } from '../../../../../../common/components/split_accordion';
import { FieldComparisonSide } from '../comparison_side/field_comparison_side';
import { FieldFinalSide } from '../field_final_side';
import { FieldUpgradeHeader } from './field_upgrade_header';
import { useFieldUpgradeContext } from './field_upgrade_context';

export function FieldUpgrade(): JSX.Element {
  const { euiTheme } = useEuiTheme();
  const { fieldName, fieldUpgradeState, hasConflict, isCustomized } = useFieldUpgradeContext();

  return (
    <>
      <SplitAccordion
        header={
          <FieldUpgradeHeader
            fieldName={fieldName}
            fieldUpgradeState={fieldUpgradeState}
            isCustomized={isCustomized}
          />
        }
        initialIsOpen={hasConflict}
        data-test-subj={`${snakeCase(fieldName)}-upgrade`}
      >
        <EuiFlexGroup gutterSize="s" alignItems="flexStart">
          <EuiFlexItem grow={1}>
            <FieldComparisonSide />
          </EuiFlexItem>
          <EuiFlexItem
            grow={0}
            css={css`
              align-self: stretch;
              border-right: ${euiTheme.border.thin};
            `}
          />
          <EuiFlexItem grow={1}>
            <FieldFinalSide />
          </EuiFlexItem>
        </EuiFlexGroup>
      </SplitAccordion>
      <EuiSpacer size="s" />
    </>
  );
}
