/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHorizontalRule, EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SecuritySolutionLinkAnchor } from '../../../../common/components/links';
import {
  RuleTranslationResult,
  SiemMigrationStatus,
} from '../../../../../common/siem_migrations/constants';
import { getRuleDetailsUrl } from '../../../../common/components/link_to';
import { SecurityPageName } from '../../../../../common';
import { type RuleMigration } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import * as i18n from './translations';
import { type TableColumn } from './constants';
import { TableHeader } from './header';

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
  // Failed
  if (migrationRule.status === SiemMigrationStatus.FAILED) {
    return null;
  }

  // Installed
  if (migrationRule.elastic_rule?.id) {
    return (
      <SecuritySolutionLinkAnchor
        deepLinkId={SecurityPageName.rules}
        path={getRuleDetailsUrl(migrationRule.elastic_rule.id)}
        data-test-subj="viewRule"
      >
        {i18n.ACTIONS_VIEW_LABEL}
      </SecuritySolutionLinkAnchor>
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
    name: (
      <TableHeader
        title={i18n.COLUMN_ACTIONS}
        tooltipContent={
          <FormattedMessage
            id="xpack.securitySolution.siemMigrations.rules.tableColumn.actionsTooltip"
            defaultMessage="{title}
            {view} - go to rule installed in the Detection rule (SIEM) page. {lineBreak}
            {install} - add rule to your Detection rule (SEIM) without enabling. {lineBreak}
            {edit} - Open detail view when a rule has not been fully translated."
            values={{
              lineBreak: <br />,
              title: (
                <EuiText size="s">
                  <p>
                    <b>{i18n.COLUMN_ACTIONS}</b>
                    <EuiHorizontalRule margin="s" />
                  </p>
                </EuiText>
              ),
              view: <b>{i18n.ACTIONS_VIEW_LABEL}</b>,
              install: <b>{i18n.ACTIONS_INSTALL_LABEL}</b>,
              edit: <b>{i18n.ACTIONS_EDIT_LABEL}</b>,
            }}
          />
        }
      />
    ),
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
