/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt, EuiPageHeader, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import React, { useMemo } from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { css } from '@emotion/react';
import { SIEM_MIGRATION_MANAGER_LICENSE_BTN } from '../messages';
import * as i18n from './translations';

export const SiemMigrationsTranslatedRulesUpsellPage = React.memo(
  function SiemMigrationsTranslatedRulesUpsellPage({
    title,
    upgradeMessage,
    upgradeHref,
  }: {
    title: React.ReactNode;
    upgradeMessage: React.ReactNode;
    upgradeHref?: string;
  }) {
    const CTAButton = useMemo(() => {
      return (
        <EuiButton
          data-test-subj="siemMigrationTranslatedRulesUpsellButton"
          href={upgradeHref}
          color="primary"
          iconType="gear"
        >
          {SIEM_MIGRATION_MANAGER_LICENSE_BTN}
        </EuiButton>
      );
    }, [upgradeHref]);

    return (
      <KibanaPageTemplate contentBorder={false} grow={true} restrictWidth={false}>
        <KibanaPageTemplate.Section color="plain" paddingSize="none">
          <EuiPageHeader bottomBorder pageTitle={i18n.SIEM_MIGRATION_UPSELLING_PAGE_TITLE} />
          <EuiFlexGroup
            css={css`
              /**
              * Height of 210px applies to both ESS and Serverless.
              * It is combination of height of Kibana Header + Action Bar and Page Header
              *
              */
              min-height: calc(100vh - 210px);
            `}
            justifyContent="center"
            alignItems="center"
            direction="column"
          >
            <EuiFlexItem>
              <EuiEmptyPrompt
                title={
                  <span data-test-subj="siemMigrationTranslatedRulesUpsellTitle">{title}</span>
                }
                actions={upgradeHref ? CTAButton : null}
                iconType={'logoSecurity'}
                body={
                  <span data-test-subj="siemMigrationTranslatedRulesUpsellUpgradeMessage">
                    {upgradeMessage}
                  </span>
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
    );
  }
);
