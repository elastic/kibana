/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButton, EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { css } from '@emotion/react';
import { useNavigation } from '../../../common/lib/kibana';
import * as i18n from './translations';

export const EmptyMigrationRulesPage = () => {
  const { navigateTo } = useNavigation();

  const navigateToStartMigrationCallback = useCallback(() => {
    navigateTo({ deepLinkId: SecurityPageName.landing, path: 'siem_migrations#start' });
  }, [navigateTo]);

  return (
    <KibanaPageTemplate.Section color="plain" paddingSize="none">
      <EuiFlexGroup
        css={css`
          /**
          * 240px compensates for the kibana header, action bar and page header.
          * It also compensates for the extra margin that header introduces
          */
          min-height: calc(100vh - 240px);
        `}
        justifyContent="center"
      >
        <EuiFlexItem>
          <EuiEmptyPrompt
            title={
              <span data-test-subj="siemMigrationsTranslatedRulesEmptyPageHeader">
                {i18n.TRANSLATED_RULES_EMPTY_PAGE_TITLE}
              </span>
            }
            actions={
              <EuiButton color="primary" onClick={navigateToStartMigrationCallback} fill>
                {i18n.TRANSLATED_RULES_EMPTY_PAGE_CTA}
              </EuiButton>
            }
            iconType={'logoSecurity'}
            body={
              <span data-test-subj="siemMigrationsTranslatedRulesEmptyPageMessage">
                {i18n.TRANSLATED_RULES_EMPTY_PAGE_MESSAGE}
              </span>
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </KibanaPageTemplate.Section>
  );
};
