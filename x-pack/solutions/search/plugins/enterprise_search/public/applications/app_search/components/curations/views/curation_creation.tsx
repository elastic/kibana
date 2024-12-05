/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import { EuiPanel, EuiTitle, EuiText, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CurationsLogic } from '..';
import { AppSearchPageTemplate } from '../../layout';
import { MultiInputRows } from '../../multi_input_rows';

import {
  CREATE_NEW_CURATION_TITLE,
  QUERY_INPUTS_BUTTON,
  QUERY_INPUTS_PLACEHOLDER,
} from '../constants';
import { getCurationsBreadcrumbs } from '../utils';

export const CurationCreation: React.FC = () => {
  const { createCuration } = useActions(CurationsLogic);

  return (
    <AppSearchPageTemplate
      pageChrome={getCurationsBreadcrumbs([CREATE_NEW_CURATION_TITLE])}
      pageHeader={{ pageTitle: CREATE_NEW_CURATION_TITLE }}
    >
      <EuiPanel hasBorder>
        <EuiTitle>
          <h2>
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.engine.curations.create.curationQueriesTitle',
              { defaultMessage: 'Curation queries' }
            )}
          </h2>
        </EuiTitle>
        <EuiText color="subdued">
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.engine.curations.create.curationQueriesDescription',
              {
                defaultMessage:
                  'Add one or multiple queries to curate. You will be able add or remove more queries later.',
              }
            )}
          </p>
        </EuiText>
        <EuiSpacer />
        <MultiInputRows
          id="createNewCuration"
          addRowText={QUERY_INPUTS_BUTTON}
          inputPlaceholder={QUERY_INPUTS_PLACEHOLDER}
          onSubmit={(queries) => createCuration(queries)}
        />
      </EuiPanel>
    </AppSearchPageTemplate>
  );
};
