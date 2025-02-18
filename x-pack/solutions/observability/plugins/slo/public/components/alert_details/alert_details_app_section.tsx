/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiFlexGroup, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AlertDetailsAppSectionProps } from '@kbn/observability-plugin/public';
import { useKibana } from '../../hooks/use_kibana';
import { useFetchSloDetails } from '../../hooks/use_fetch_slo_details';
import { CustomAlertDetailsPanel } from './components/custom_panels/custom_panels';
import { ErrorRatePanel } from './components/error_rate/error_rate_panel';
import { BurnRateAlert, BurnRateRule } from './types';

interface AppSectionProps extends AlertDetailsAppSectionProps {
  alert: BurnRateAlert;
  rule: BurnRateRule;
}

// eslint-disable-next-line import/no-default-export
export default function AlertDetailsAppSection({ alert, rule, setSources }: AppSectionProps) {
  const {
    services: {
      http: { basePath },
    },
  } = useKibana();

  const sloId = alert.fields['kibana.alert.rule.parameters']!.sloId as string;
  const instanceId = alert.fields['kibana.alert.instance.id']!;
  const { isLoading, data: slo } = useFetchSloDetails({ sloId, instanceId });
  const alertLink = alert.link;

  useEffect(() => {
    const fields = [
      {
        label: i18n.translate('xpack.slo.burnRateRule.alertDetailsAppSection.summaryField.slo', {
          defaultMessage: 'SLO',
        }),
        value: (
          <EuiLink data-test-subj="sloLink" href={basePath.prepend(alertLink!)}>
            {slo?.name ?? '-'}
          </EuiLink>
        ),
      },
    ];

    setSources(fields);
  }, [alertLink, rule, setSources, basePath, slo, instanceId]);

  return (
    <EuiFlexGroup direction="column" data-test-subj="overviewSection">
      <ErrorRatePanel alert={alert} slo={slo} isLoading={isLoading} />
      <CustomAlertDetailsPanel alert={alert} slo={slo} rule={rule} />
    </EuiFlexGroup>
  );
}
