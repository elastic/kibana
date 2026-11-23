/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../common/ebt_constants';
import { useKibana } from '../../../hooks/use_kibana';
import { getUnconnectedSlackChannelsMessage } from '../utils/unconnected_slack_channels';

export const UnconnectedSlackChannelsCallout = ({ channels }: { channels: string[] }) => {
  const { application } = useKibana().services;

  return (
    <>
      <KbnWarningCallout
        size="s"
        title={getUnconnectedSlackChannelsMessage(channels)}
        actionProps={{
          primary: {
            children: i18n.translate(
              'xpack.nightshift.automations.detail.unconnectedSlackChannelsLink',
              { defaultMessage: 'Connect channels in Slack settings' }
            ),
            href: application.getUrlForApp(NIGHTSHIFT_APP_ID, { path: '/settings/general' }),
            'data-test-subj': 'automationBrokenSlackChannelCalloutLink',
            ...getEbtProps({
              action: NIGHTSHIFT_EBT_ACTIONS.VIEW_SETTINGS,
              element: NIGHTSHIFT_EBT_ELEMENTS.AUTOMATIONS_DETAIL_FLYOUT,
            }),
          },
        }}
        data-test-subj="automationBrokenSlackChannelCallout"
      />
      <EuiSpacer size="m" />
    </>
  );
};
