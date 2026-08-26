/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { OpenAdWorkerConfigButton } from '../../components/ad_worker_config';
import { PndPageSection } from '../../components/layout/pnd_page_section';
import { usePndDocTitle } from '../../hooks/use_pnd_doc_title';
import * as i18n from './translations';

export const SettingsPage: React.FC = () => {
  usePndDocTitle(i18n.PAGE_TITLE);

  return (
    <PndPageSection>
      <EuiTitle size="l">
        <h1>{i18n.PAGE_TITLE}</h1>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText color="subdued" size="s">
        <p>{i18n.MOCK_DATA_NOTE}</p>
      </EuiText>
      <EuiSpacer size="l" />
      <OpenAdWorkerConfigButton />
    </PndPageSection>
  );
};
