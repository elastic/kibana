/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiSpacer, EuiTitle } from '@elastic/eui';
import { SplitAccordion } from '../../../../common/components/split_accordion';
import { convertFieldToDisplayName } from '../../../rule_management/components/rule_details/helpers';
import { DiffView } from '../../../rule_management/components/rule_details/json_diff/diff_view';
import * as i18n from './translations';

interface ChangeDetailsTabProps {
  changedFields: string[];
  oldValues: Record<string, unknown>;
  ruleSnapshot: Record<string, unknown>;
}

const formatValueForDiff = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

export function ChangeDetailsTab({
  changedFields,
  oldValues,
  ruleSnapshot,
}: ChangeDetailsTabProps): JSX.Element {
  if (changedFields.length === 0) {
    return <p>{i18n.NO_VISIBLE_CHANGES}</p>;
  }

  return (
    <>
      {changedFields.map((fieldName) => (
        <React.Fragment key={fieldName}>
          <SplitAccordion
            header={
              <EuiTitle size="xs">
                <h5>{convertFieldToDisplayName(fieldName)}</h5>
              </EuiTitle>
            }
            initialIsOpen
          >
            <EuiFlexGroup justifyContent="spaceBetween">
              <DiffView
                viewType="unified"
                oldSource={formatValueForDiff(oldValues[fieldName])}
                newSource={formatValueForDiff(ruleSnapshot[fieldName])}
              />
            </EuiFlexGroup>
          </SplitAccordion>
          <EuiSpacer size="l" />
        </React.Fragment>
      ))}
    </>
  );
}
