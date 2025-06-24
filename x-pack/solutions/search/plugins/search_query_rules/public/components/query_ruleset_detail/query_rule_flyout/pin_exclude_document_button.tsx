/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { QueryRulesQueryRuleType } from '@elastic/elasticsearch/lib/api/types';

interface ExcludePinDocumentButtonProps {
  documentCount: number;
  addNewAction: () => void;
  pinType: QueryRulesQueryRuleType;
}
export const ExcludePinDocumentButton: React.FC<ExcludePinDocumentButtonProps> = ({
  documentCount,
  addNewAction,
  pinType,
}) => {
  return (
    <EuiButton
      data-test-subj="searchQueryRulesQueryRuleFlyoutButton"
      iconType="plusInCircle"
      color={documentCount === 0 ? 'primary' : 'text'}
      size="s"
      onClick={addNewAction}
      fill={documentCount === 0}
    >
      {pinType === 'pinned' ? (
        documentCount === 0 ? (
          <FormattedMessage
            id="xpack.search.queryRulesetDetail.queryRuleFlyout.addPinnedDocumentButton"
            defaultMessage="Pin document"
          />
        ) : (
          <FormattedMessage
            id="xpack.search.queryRulesetDetail.queryRuleFlyout.addPinnedDocumentButtonMore"
            defaultMessage="Pin 1 more document"
          />
        )
      ) : documentCount === 0 ? (
        <FormattedMessage
          id="xpack.search.queryRulesetDetail.queryRuleFlyout.addExcludedDocumentButton"
          defaultMessage="Exclude document"
        />
      ) : (
        <FormattedMessage
          id="xpack.search.queryRulesetDetail.queryRuleFlyout.addExcludedDocumentButtonMore"
          defaultMessage="Exclude 1 more document"
        />
      )}
    </EuiButton>
  );
};
