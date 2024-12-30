/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';

import { useValues, useActions } from 'kea';

import { EuiButton, EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { EngineLogic } from '../../engine';
import { AppSearchPageTemplate } from '../../layout';
import { AutomatedIcon } from '../components/automated_icon';

import {
  AUTOMATED_LABEL,
  COVERT_TO_MANUAL_BUTTON_LABEL,
  CONVERT_TO_MANUAL_CONFIRMATION,
} from '../constants';

import { getCurationsBreadcrumbs } from '../utils';

import { AutomatedCurationHistory } from './automated_curation_history';
import { HIDDEN_DOCUMENTS_TITLE, PROMOTED_DOCUMENTS_TITLE } from './constants';
import { CurationLogic } from './curation_logic';
import { DeleteCurationButton } from './delete_curation_button';
import { PromotedDocuments, OrganicDocuments } from './documents';

export const AutomatedCuration: React.FC = () => {
  const { curationId } = useParams<{ curationId: string }>();
  const logic = CurationLogic({ curationId });
  const { convertToManual, onSelectPageTab } = useActions(logic);
  const { activeQuery, queries, curation, selectedPageTab } = useValues(logic);
  const { engineName } = useValues(EngineLogic);

  const pageTabs = [
    {
      label: PROMOTED_DOCUMENTS_TITLE,
      append: <EuiBadge>{curation.promoted.length}</EuiBadge>,
      isSelected: selectedPageTab === 'promoted',
      onClick: () => onSelectPageTab('promoted'),
    },
    {
      label: HIDDEN_DOCUMENTS_TITLE,
      append: <EuiBadge isDisabled>0</EuiBadge>,
      isSelected: false,
      disabled: true,
    },
    {
      label: i18n.translate(
        'xpack.enterpriseSearch.appSearch.engine.curation.detail.historyButtonLabel',
        {
          defaultMessage: 'History',
        }
      ),
      isSelected: selectedPageTab === 'history',
      onClick: () => onSelectPageTab('history'),
    },
  ];

  return (
    <AppSearchPageTemplate
      pageChrome={getCurationsBreadcrumbs([queries.join(', ')])}
      pageHeader={{
        pageTitle: (
          <>
            {activeQuery}{' '}
            <EuiBadge iconType={AutomatedIcon} color="accent">
              {AUTOMATED_LABEL}
            </EuiBadge>
          </>
        ),
        rightSideItems: [
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <DeleteCurationButton />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                color="primary"
                fill
                iconType="exportAction"
                onClick={() => {
                  if (window.confirm(CONVERT_TO_MANUAL_CONFIRMATION)) convertToManual();
                }}
              >
                {COVERT_TO_MANUAL_BUTTON_LABEL}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>,
        ],
        tabs: pageTabs,
      }}
    >
      {selectedPageTab === 'promoted' && <PromotedDocuments />}
      {selectedPageTab === 'promoted' && <OrganicDocuments />}
      {selectedPageTab === 'history' && (
        <AutomatedCurationHistory query={curation.queries[0]} engineName={engineName} />
      )}
    </AppSearchPageTemplate>
  );
};
