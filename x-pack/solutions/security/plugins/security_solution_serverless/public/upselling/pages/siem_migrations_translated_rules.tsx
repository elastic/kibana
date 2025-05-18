/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SiemMigrationsTranslatedRulesUpsellPage as SiemMigrationsTranslatedRulesUpsellPageCommon } from '@kbn/security-solution-upselling/pages/siem_migrations_translated_rules';
import * as i18n from '../translations';

export const SiemMigrationsTranslatedRulesUpsellPage = React.memo(
  function SiemMigrationsTranslatedRulesUpsellPage() {
    return (
      <SiemMigrationsTranslatedRulesUpsellPageCommon
        title={i18n.SIEM_MIGRATION_UPSELLING_TITLE('Complete')}
        upgradeMessage={i18n.SIEM_MIGRATION_RULES_PAGE_UPGRADE_LICENSE_MESSAGE}
      />
    );
  }
);
