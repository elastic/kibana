/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiText } from '@elastic/eui';
import {
  ALERT_RULE_CATEGORY,
  ALERT_UUID,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import React from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { useFetchAlert } from '../../../../hooks/use_fetch_alert';
import { useInvestigation } from '../../contexts/investigation_context';

export function AlertDetailsButton() {
  const {
    core: {
      http: { basePath },
    },
  } = useKibana();
  const { investigation } = useInvestigation();

  const { data: alertDetails } = useFetchAlert({ investigation });

  if (!alertDetails) {
    return null;
  }
  return (
    <EuiButtonEmpty
      data-test-subj="investigationDetailsAlertLink"
      iconType="arrowLeft"
      size="xs"
      href={basePath.prepend(`/app/observability/alerts/${alertDetails[ALERT_UUID]}`)}
    >
      <EuiText size="s">{`[Alert] ${alertDetails?.[ALERT_RULE_CATEGORY]} breached`}</EuiText>
    </EuiButtonEmpty>
  );
}
