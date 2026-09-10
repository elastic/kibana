/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { useAlertZeroDocTitle } from '../../hooks/use_alertzero_doc_title';
import { AlertZeroPageSection } from '../layout/alertzero_page_section';
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
  const history = useHistory();
  useAlertZeroDocTitle(title);

  return (
    <AlertZeroPageSection>
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
    </AlertZeroPageSection>
  );
};
