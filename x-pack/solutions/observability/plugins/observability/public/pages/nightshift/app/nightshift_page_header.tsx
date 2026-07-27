/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../common/ebt_constants';

const nightshiftPageTitle = i18n.translate('xpack.observability.nightshift.pageTitle', {
  defaultMessage: 'Nightshift',
});

const settingsLabel = i18n.translate('xpack.observability.nightshift.settingsLinkLabel', {
  defaultMessage: 'Settings',
});

export function NightshiftPageHeader({
  settingsHref,
}: {
  settingsHref: string;
}): React.ReactElement {
  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="none"
      justifyContent="spaceBetween"
      responsive={false}
    >
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h1>{nightshiftPageTitle}</h1>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          color="text"
          data-test-subj="nightshiftSettingsLink"
          flush="right"
          href={settingsHref}
          iconType="gear"
          size="s"
          {...getEbtProps({
            action: NIGHTSHIFT_EBT_ACTIONS.VIEW_SETTINGS,
            element: NIGHTSHIFT_EBT_ELEMENTS.PAGE_HEADER,
          })}
        >
          {settingsLabel}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
