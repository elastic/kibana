/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHeaderLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useInspectorContext } from '@kbn/observability-shared-plugin/public';
import { useKibana } from '../../../utils/kibana_react';

export function InspectorHeaderLink() {
  const {
    services: { inspector },
  } = useKibana();

  const { inspectorAdapters } = useInspectorContext();

  const inspect = () => {
    inspector.open(inspectorAdapters);
  };

  return (
    <EuiHeaderLink color="primary" onClick={inspect}>
      {i18n.translate('xpack.observability.inspectButtonText', {
        defaultMessage: 'Inspect',
      })}
    </EuiHeaderLink>
  );
}
