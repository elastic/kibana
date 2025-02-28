/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { SIEM_MIGRATION_MANAGER_LICENSE_BTN } from '../messages';
import * as i18n from './translations';

export const SiemMigrationTranslatedRulesUpsellPage = React.memo(
  function SiemMigrationTranslatedRulesUpsellPage({
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
        <KibanaPageTemplate.Section color="plain">
          <EuiPageHeader bottomBorder pageTitle={i18n.SIEM_MIGRATION_UPSELLING_PAGE_TITLE} />
          <EuiSpacer size="xxl" />
          <EuiSpacer size="xxl" />
          <EuiEmptyPrompt
            title={<span>{title}</span>}
            actions={upgradeHref ? CTAButton : null}
            iconType={'logoSecurity'}
            body={<span>{upgradeMessage}</span>}
          >
            {upgradeMessage}
          </EuiEmptyPrompt>
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
    );
  }
);
