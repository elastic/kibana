/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { useKibana } from '../../../../common/services';
import * as i18n from './translations';

const UpgradeActionsComponent = () => {
  const { services } = useKibana();

  return (
    <EuiFlexGroup
      data-test-subj="upgradeButtons"
      gutterSize="s"
      justifyContent="spaceAround"
      wrap={true}
    >
      <EuiFlexItem grow={false}>
        <EuiButton
          data-test-subj="upgradeDocs"
          href="https://www.elastic.co/subscriptions"
          iconType="popout"
          iconSide="right"
          target="_blank"
        >
          {i18n.UPGRADE_DOCS}
        </EuiButton>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiButton
          data-test-subj="upgradeCta"
          href={services.application.getUrlForApp('management', {
            path: 'stack/license_management',
          })}
          iconType="gear"
          target="_blank"
        >
          {i18n.UPGRADE_CTA}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const UpgradeActions = React.memo(UpgradeActionsComponent);
