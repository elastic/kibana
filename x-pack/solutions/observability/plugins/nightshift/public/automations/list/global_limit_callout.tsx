/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../common/ebt_constants';
import { globalLimitLabels } from './translations';

export const GlobalLimitCallout = ({ settingsHref }: { settingsHref?: string }) => (
  <EuiCallOut
    announceOnMount
    size="s"
    color="warning"
    title={globalLimitLabels.title}
    text={globalLimitLabels.body}
    actionProps={
      settingsHref
        ? {
            primary: {
              children: globalLimitLabels.goToSettings,
              href: settingsHref,
              'data-test-subj': 'automationsGlobalLimitSettingsLink',
              ...getEbtProps({
                action: NIGHTSHIFT_EBT_ACTIONS.VIEW_SETTINGS,
                element: NIGHTSHIFT_EBT_ELEMENTS.AUTOMATIONS_LIST,
              }),
            },
          }
        : undefined
    }
    data-test-subj="automationsGlobalLimitBanner"
  />
);
