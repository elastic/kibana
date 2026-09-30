/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import { EuiBadge, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnInfoCallout } from '@kbn/ui-callout';

import { docLinks } from '../../../../../../shared/doc_links';

import type { TextExpansionCallOutState } from './text_expansion_callout';
import { TextExpansionCalloutLogic } from './text_expansion_callout_logic';

export const DeployModel = ({
  dismiss,
  ingestionMethod,
  isCreateButtonDisabled,
  isDismissable,
}: Pick<
  TextExpansionCallOutState,
  'dismiss' | 'ingestionMethod' | 'isCreateButtonDisabled' | 'isDismissable'
>) => {
  const { createTextExpansionModel } = useActions(TextExpansionCalloutLogic);

  return (
    <KbnInfoCallout
      title={
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
          <EuiBadge color="primary">
            <FormattedMessage
              id="xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.titleBadge"
              defaultMessage="New"
            />
          </EuiBadge>
          <span>
            {i18n.translate(
              'xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.title',
              { defaultMessage: 'Improve your results with ELSER' }
            )}
          </span>
        </EuiFlexGroup>
      }
      text={
        <FormattedMessage
          id="xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.body"
          defaultMessage="ELSER (Elastic Learned Sparse EncodeR) is Elastic's NLP model for English semantic search, utilizing sparse vectors. It prioritizes intent and contextual meaning over literal term matching, optimized specifically for English documents and queries on the Elastic platform."
          tagName="p"
        />
      }
      actionProps={{
        primary: {
          children: i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.textExpansionCallOut.deployButton.label',
            {
              defaultMessage: 'Deploy',
            }
          ),
          'data-telemetry-id': `entSearchContent-${ingestionMethod}-pipelines-textExpansionCallOut-deployModel`,
          disabled: isCreateButtonDisabled,
          iconType: 'rocket',
          onClick: () => createTextExpansionModel(),
        },
        secondary: {
          children: (
            <FormattedMessage
              id="xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.learnMoreLink"
              defaultMessage="Learn more"
            />
          ),
          href: docLinks.elser,
          target: '_blank',
        },
      }}
      onDismiss={isDismissable ? dismiss : undefined}
      dismissButtonProps={{ 'data-test-subj': 'enterpriseSearchTextExpansionDismissButtonButton' }}
    />
  );
};
