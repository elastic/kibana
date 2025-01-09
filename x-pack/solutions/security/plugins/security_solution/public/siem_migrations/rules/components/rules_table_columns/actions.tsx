/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiLink } from '@elastic/eui';
import {
  RuleTranslationResult,
  SiemMigrationStatus,
} from '../../../../../common/siem_migrations/constants';
import { getRuleDetailsUrl } from '../../../../common/components/link_to';
import { useKibana } from '../../../../common/lib/kibana';
import { APP_UI_ID, SecurityPageName } from '../../../../../common';
import { type RuleMigration } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import * as i18n from './translations';
import { type TableColumn } from './constants';

const isModifiedEvent = (event: React.MouseEvent) =>
  !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);

const isLeftClickEvent = (event: React.MouseEvent) => event.button === 0;

interface ActionNameProps {
  disableActions?: boolean;
  migrationRule: RuleMigration;
  openMigrationRuleDetails: (migrationRule: RuleMigration) => void;
  installMigrationRule: (migrationRule: RuleMigration, enable?: boolean) => void;
}

const ActionName = ({
  disableActions,
  migrationRule,
  openMigrationRuleDetails,
  installMigrationRule,
}: ActionNameProps) => {
  const { getUrlForApp, navigateToUrl } = useKibana().services.application;

  const hrefRuleDetails = useMemo(
    () =>
      getUrlForApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.rules,
        path: getRuleDetailsUrl(migrationRule.elastic_rule?.id ?? ''),
      }),
    [getUrlForApp, migrationRule.elastic_rule?.id]
  );

  const goToRuleDetails = useCallback(
    (event: React.MouseEvent) => {
      if (!isModifiedEvent(event) && isLeftClickEvent(event)) {
        event.preventDefault();
        navigateToUrl(hrefRuleDetails);
      }
    },
    [hrefRuleDetails, navigateToUrl]
  );

  // Failed
  if (migrationRule.status === SiemMigrationStatus.FAILED) {
    return null;
  }

  // Installed
  if (migrationRule.elastic_rule?.id) {
    return (
      // eslint-disable-next-line @elastic/eui/href-or-on-click
      <EuiLink href={hrefRuleDetails} onClick={goToRuleDetails} data-test-subj="viewRule">
        {i18n.ACTIONS_VIEW_LABEL}
      </EuiLink>
    );
  }

  // Installable
  if (migrationRule.translation_result === RuleTranslationResult.FULL) {
    return (
      <EuiLink
        disabled={disableActions}
        onClick={() => {
          installMigrationRule(migrationRule);
        }}
        data-test-subj="installRule"
      >
        {i18n.ACTIONS_INSTALL_LABEL}
      </EuiLink>
    );
  }

  // Partially translated or untranslated
  return (
    <EuiLink
      disabled={disableActions}
      onClick={() => {
        openMigrationRuleDetails(migrationRule);
      }}
      data-test-subj="editRule"
    >
      {i18n.ACTIONS_EDIT_LABEL}
    </EuiLink>
  );
};

interface CreateActionsColumnProps {
  disableActions?: boolean;
  openMigrationRuleDetails: (migrationRule: RuleMigration) => void;
  installMigrationRule: (migrationRule: RuleMigration, enable?: boolean) => void;
}

export const createActionsColumn = ({
  disableActions,
  openMigrationRuleDetails,
  installMigrationRule,
}: CreateActionsColumnProps): TableColumn => {
  return {
    field: 'elastic_rule',
    name: i18n.COLUMN_ACTIONS,
    render: (_, rule: RuleMigration) => {
      return (
        <ActionName
          disableActions={disableActions}
          migrationRule={rule}
          openMigrationRuleDetails={openMigrationRuleDetails}
          installMigrationRule={installMigrationRule}
        />
      );
    },
    width: '10%',
    align: 'center',
  };
};
