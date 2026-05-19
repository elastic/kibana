/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHeaderLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { enableInspectEsQueries } from '@kbn/observability-plugin/public';
import { useInspectorContext } from '@kbn/observability-shared-plugin/public';
import { useKibana } from '../../hooks/use_kibana';
import { usePluginContext } from '../../hooks/use_plugin_context';

export function InspectorHeaderLink() {
  const {
    services: { inspector, uiSettings },
  } = useKibana();

  const { isDev } = usePluginContext();
  const { inspectorAdapters } = useInspectorContext();
  const isInspectorEnabled = uiSettings?.get<boolean>(enableInspectEsQueries);

  if (!isInspectorEnabled && !isDev) {
    return null;
  }

  return (
    <EuiHeaderLink
      color="primary"
      onClick={() => inspector.open(inspectorAdapters)}
      data-test-subj="sloInspectHeaderLink"
    >
      {i18n.translate('xpack.slo.inspectButtonText', {
        defaultMessage: 'Inspect',
      })}
    </EuiHeaderLink>
  );
}
