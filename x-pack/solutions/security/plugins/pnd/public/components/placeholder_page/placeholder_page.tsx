/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt, EuiPageSection, EuiText, useEuiTheme } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { usePndDocTitle } from '../../hooks/use_pnd_doc_title';
import { PND_FAB_CONTENT_OFFSET } from '../layout/constants';
import { PndPageHeader } from '../pnd_page_header';
import * as i18n from './translations';

interface PlaceholderPageProps {
  title: string;
  description?: string;
  showBackToBrief?: boolean;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  description,
  showBackToBrief = true,
}) => {
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  usePndDocTitle(title);

  return (
    <EuiPageSection
      paddingSize="l"
      css={{ paddingTop: euiTheme.size.l, paddingBottom: PND_FAB_CONTENT_OFFSET }}
    >
      <PndPageHeader title={title} />
      <EuiEmptyPrompt
        iconType="aggregate"
        body={
          <EuiText color="subdued" size="s">
            <p>{description ?? i18n.PLACEHOLDER_BODY}</p>
          </EuiText>
        }
        actions={
          showBackToBrief ? (
            <EuiButton onClick={() => history.push('/')} fill>
              {i18n.PLACEHOLDER_BACK}
            </EuiButton>
          ) : undefined
        }
      />
    </EuiPageSection>
  );
};
