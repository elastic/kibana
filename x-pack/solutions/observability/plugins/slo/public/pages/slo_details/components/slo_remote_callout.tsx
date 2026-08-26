/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { createRemoteSloDetailsUrl } from '../../../utils/slo/remote_slo_urls';
import { useSpace } from '../../../hooks/use_space';

export function SloRemoteCallout({ slo }: { slo: SLOWithSummaryResponse }) {
  const spaceId = useSpace();
  const sloDetailsUrl = createRemoteSloDetailsUrl(slo, spaceId);

  if (!slo.remote) {
    return null;
  }

  return (
    <KbnInfoCallout
      title={i18n.translate('xpack.slo.sloDetails.headerTitle.calloutMessage', {
        defaultMessage: 'Remote SLO',
      })}
      text={
        <FormattedMessage
          id="xpack.slo.sloDetails.headerTitle.calloutDescription"
          defaultMessage="This is a remote SLO which belongs to another Kibana instance. It is fetched from the remote cluster: {remoteName} with Kibana URL {kibanaUrl}."
          values={{
            remoteName: <strong>{slo.remote.remoteName}</strong>,
            kibanaUrl: (
              <EuiLink
                data-test-subj="sloSloRemoteCalloutLink"
                href={slo.remote.kibanaUrl}
                target="_blank"
              >
                {slo.remote.kibanaUrl}
              </EuiLink>
            ),
          }}
        />
      }
      actionProps={{
        primary: {
          'data-test-subj': 'o11yHeaderTitleLinkButtonButton',
          href: sloDetailsUrl,
          target: '_blank',
          iconType: 'external',
          iconSide: 'right',
          children: i18n.translate('xpack.slo.headerTitle.linkButtonButtonLabel', {
            defaultMessage: 'View remote SLO details',
          }),
        },
      }}
    />
  );
}
