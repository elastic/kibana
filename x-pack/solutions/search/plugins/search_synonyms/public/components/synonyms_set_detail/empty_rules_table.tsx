/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { docLinks } from '../../../common/doc_links';
import { SynonymsSetEmptyRulesCards } from './empty_rules_cards';

interface SynonymsSetEmptyRuleTableProps {
  onCreateRule: (type: 'equivalent' | 'explicit') => void;
}
export const SynonymsSetEmptyRuleTable: React.FC<SynonymsSetEmptyRuleTableProps> = ({
  onCreateRule,
}) => {
  return (
    <EuiFlexGroup direction="column" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiTitle>
          <h2>
            {i18n.translate('xpack.searchSynonyms.synonymsSetEmptyRuleTable.title', {
              defaultMessage: 'Select a rule type',
            })}
          </h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiLink
          data-test-subj="searchSynonymsSynonymsSetEmptyRuleTableViewDocumentationLink"
          href={docLinks.synonymsApi}
        >
          {i18n.translate('xpack.searchSynonyms.synonymsSetEmptyRuleTable.viewDocumentation', {
            defaultMessage: 'View documentation',
          })}
        </EuiLink>
      </EuiFlexItem>
      <EuiFlexItem>
        <SynonymsSetEmptyRulesCards onCreateRule={onCreateRule} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
