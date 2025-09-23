/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButtonGroup } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface MetadataTypeSelectorProps {
  isAlways: boolean;
  onChange: (isAlways: boolean) => void;
}
export const MetadataTypeSelector: React.FC<MetadataTypeSelectorProps> = ({
  isAlways,
  onChange,
}) => {
  return (
    <EuiButtonGroup
      legend="Criteria"
      className="eui-displayInlineBlock"
      options={[
        {
          'data-test-subj': 'searchQueryRulesQueryRuleCriteriaCustom',
          id: 'custom',
          label: (
            <>
              <FormattedMessage
                id="xpack.search.queryRulesetDetail.queryRuleFlyout.criteria.custom"
                defaultMessage="Custom"
              />
            </>
          ),
        },
        {
          'data-test-subj': 'searchQueryRulesQueryRuleCriteriaAlways',
          id: 'always',
          label: (
            <>
              <FormattedMessage
                id="xpack.search.queryRulesetDetail.queryRuleFlyout.criteria.always"
                defaultMessage="Always"
              />
            </>
          ),
        },
      ]}
      onChange={(id) => {
        onChange(id === 'always');
      }}
      buttonSize="compressed"
      type="single"
      idSelected={isAlways ? 'always' : 'custom'}
    />
  );
};
