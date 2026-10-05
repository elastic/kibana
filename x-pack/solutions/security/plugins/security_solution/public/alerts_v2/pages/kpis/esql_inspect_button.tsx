/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { useKibana } from '../../../common/lib/kibana';

/** Last ES|QL request/response captured by a KPI hook, for the Inspect flyout. */
export interface EsqlInspect {
  request: object;
  response: object;
}

export interface EsqlInspectButtonProps {
  /** The last ES|QL request + response, or null before the first successful run. */
  inspect: EsqlInspect | null;
  /** Title shown in the Inspector flyout and the button's aria-label. */
  title: string;
}

/**
 * Shared inspect icon for the Alerts v2 KPIs. Opens the Kibana Inspector with the
 * exact ES|QL request/response a chart ran.
 */
export const EsqlInspectButton = ({ inspect, title }: EsqlInspectButtonProps) => {
  const {
    services: { inspector },
  } = useKibana();

  const onInspect = useCallback(() => {
    if (!inspect) {
      return;
    }
    const adapter = new RequestAdapter();
    const request = adapter.start(title);
    request.json(inspect.request);
    request.ok({ json: inspect.response });
    inspector.open({ requests: adapter }, { title });
  }, [inspect, inspector, title]);

  return (
    <EuiButtonIcon
      iconType="inspect"
      color="text"
      onClick={onInspect}
      isDisabled={!inspect}
      data-test-subj="alertsV2InspectButton"
      aria-label={i18n.translate('xpack.securitySolution.alertsV2.inspectAriaLabel', {
        defaultMessage: 'Inspect the ES|QL query for {title}',
        values: { title },
      })}
    />
  );
};
