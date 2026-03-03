/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';

import type { WarningSchema } from '../../../../../common/api/detection_engine';
import { MAX_RULES_WITH_GAPS_LIMIT_REACHED_WARNING_TYPE } from '../../../../../common/constants';
import * as i18n from '../../../common/translations';

interface RulesTableWarningsProps {
  warnings?: WarningSchema[];
}

export const RulesTableWarnings: React.FC<RulesTableWarningsProps> = ({ warnings }) => {
  if (!warnings || warnings.length === 0) {
    return null;
  }

  const getMessageForWarning = (warning: WarningSchema) => {
    switch (warning.type) {
      case MAX_RULES_WITH_GAPS_LIMIT_REACHED_WARNING_TYPE:
        return i18n.RULES_TABLE_MAX_RULES_WITH_GAPS_WARNING_MESSAGE;
      default:
        return warning.message;
    }
  };

  return (
    <>
      <EuiSpacer size="m" />
      {warnings.map((warning, index) => (
        <div key={`${warning.type}-${index}`}>
          <EuiCallOut
            data-test-subj={`rulesTableWarningsCallOut-${index}`}
            size="m"
            iconType="help"
            color="warning"
            announceOnMount={false}
          >
            {getMessageForWarning(warning)}
          </EuiCallOut>
          <EuiSpacer size="s" />
        </div>
      ))}
      <EuiSpacer size="m" />
    </>
  );
};

RulesTableWarnings.displayName = 'RulesTableWarnings';
