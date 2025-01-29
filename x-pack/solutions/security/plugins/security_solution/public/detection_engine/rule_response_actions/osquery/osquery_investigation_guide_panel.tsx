/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useState } from 'react';

interface OsqueryInvestigationGuidePanelProps {
  onClick: () => void;
  queriesLength: number;
}

const panelCss = {
  marginBottom: '16px',
};
const flexGroupCss = { padding: `0 24px` };

export const OsqueryInvestigationGuidePanel = React.memo<OsqueryInvestigationGuidePanelProps>(
  ({ onClick, queriesLength }) => {
    const [hideInvestigationGuideSuggestion, setHideInvestigationGuideSuggestion] = useState(false);

    const handleClick = useCallback(() => {
      onClick();
      setHideInvestigationGuideSuggestion(true);
    }, [onClick]);

    if (hideInvestigationGuideSuggestion) {
      return null;
    }
    return (
      <EuiPanel color={'primary'} paddingSize={'xs'} css={panelCss}>
        <EuiFlexGroup direction={'row'} alignItems={'center'} css={flexGroupCss}>
          <EuiFlexItem grow={true} data-test-subj={'osquery-investigation-guide-text'}>
            <EuiText size="s">
              <FormattedMessage
                id="xpack.securitySolution.responseActionsList.investigationGuideSuggestion"
                defaultMessage="You have {queriesLength, plural, one {a query} other {queries}} in the investigation guide. Add {queriesLength, plural, one {it as a response action} other {them as response actions}}?"
                values={{
                  queriesLength,
                }}
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size={'m'}
              color={'primary'}
              onClick={handleClick}
              data-test-subj={'osqueryAddInvestigationGuideQueries'}
            >
              <EuiText size="s">
                <FormattedMessage
                  id="xpack.securitySolution.responseActionsList.addButton"
                  defaultMessage="Add"
                />
              </EuiText>
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);

OsqueryInvestigationGuidePanel.displayName = 'OsqueryInvestigationGuidePanel';
