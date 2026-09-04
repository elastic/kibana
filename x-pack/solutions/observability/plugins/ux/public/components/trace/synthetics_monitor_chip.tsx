/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiBadge, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import {
  fetchSyntheticsMonitorMatch,
  type SyntheticsMonitorMatch,
} from '../../services/rest/synthetics_api';

export const SyntheticsMonitorChip = ({
  pagePath,
  showCreateCheck,
}: {
  pagePath: string;
  showCreateCheck: boolean;
}) => {
  const { http, application } = useKibanaServices();
  const [forbidden, setForbidden] = useState(false);
  const [match, setMatch] = useState<SyntheticsMonitorMatch | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchSyntheticsMonitorMatch({ http, pagePath }).then((result) => {
      if (cancelled) {
        return;
      }
      setForbidden(result.forbidden);
      setMatch(result.match);
    });
    return () => {
      cancelled = true;
    };
  }, [http, pagePath]);

  if (forbidden) {
    return null;
  }

  const addHref = application.getUrlForApp('synthetics', { path: '/add-monitor' });

  if (match) {
    const href = application.getUrlForApp('synthetics', {
      path: `/monitor/${encodeURIComponent(match.configId)}`,
    });
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.ux.synthetics.monitoredLabel', {
              defaultMessage: 'Synthetics',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge
            href={href}
            color="hollow"
            iconType="chartLine"
            data-test-subj="uxSyntheticsMonitorChip"
          >
            {match.name}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (!showCreateCheck) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          data-test-subj="uxSyntheticsCreateCheck"
          size="s"
          iconType="plusCircle"
          href={addHref}
        >
          {i18n.translate('xpack.ux.synthetics.createCheck', {
            defaultMessage: 'Create synthetic check',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
