/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { SecurityPageName } from '../../../../../common';
import { useGetSecuritySolutionLinkProps } from '../../../../common/components/links';
import * as i18n from './translations';

export const EmptyMigration: React.FC = React.memo(() => {
  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps();
  const { onClick: onClickLink } = getSecuritySolutionLinkProps({
    deepLinkId: SecurityPageName.landing,
    path: 'siem_migrations',
  });

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      responsive={false}
      direction="column"
      wrap={true}
    >
      <EuiFlexItem grow={false}>
        <EuiEmptyPrompt
          title={<h2>{i18n.NO_TRANSLATIONS_AVAILABLE_FOR_INSTALL}</h2>}
          titleSize="s"
          body={i18n.NO_TRANSLATIONS_AVAILABLE_FOR_INSTALL_BODY}
          data-test-subj="noRulesTranslationAvailableForInstall"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          fill
          iconType="arrowLeft"
          color={'primary'}
          onClick={onClickLink}
          data-test-subj="goToSiemMigrationsButton"
        >
          {i18n.GO_BACK_TO_RULES_TABLE_BUTTON}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
EmptyMigration.displayName = 'EmptyMigration';
