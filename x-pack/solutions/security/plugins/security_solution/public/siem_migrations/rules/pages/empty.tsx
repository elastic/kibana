/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { css } from '@emotion/react';
import { SecuritySolutionLinkButton } from '../../../common/components/links';
import * as i18n from './translations';
import { OnboardingCardId, OnboardingTopicId } from '../../../onboarding/constants';

export const EmptyMigrationRulesPage = () => {
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
        alignItems="center"
      >
        <EuiFlexItem>
          <EuiEmptyPrompt
            title={
              <span data-test-subj="siemMigrationsTranslatedRulesEmptyPageHeader">
                {i18n.TRANSLATED_RULES_EMPTY_PAGE_TITLE}
              </span>
            }
            actions={
              <SecuritySolutionLinkButton
                deepLinkId={SecurityPageName.landing}
                path={`${OnboardingTopicId.siemMigrations}#${OnboardingCardId.siemMigrationsRules}`}
              >
                {i18n.TRANSLATED_RULES_EMPTY_PAGE_CTA}
              </SecuritySolutionLinkButton>
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
