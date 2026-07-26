/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHeaderLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { enableInspectEsQueries } from '@kbn/observability-plugin/public';
import { useInspectorContext } from '@kbn/observability-shared-plugin/public';
import { useKibanaContextForPlugin } from '../hooks/use_kibana';

export const InspectorHeaderLink = () => {
  const {
    services: { inspector },
  } = useKibanaContextForPlugin();
  const { inspectorAdapters } = useInspectorContext();
  const {
    services: { uiSettings },
  } = useKibana();
  const isInspectorEnabled = uiSettings?.get<boolean>(enableInspectEsQueries);

  if (!isInspectorEnabled) {
    return null;
  }

  return (
    <EuiHeaderLink
      color="primary"
      onClick={() => inspector.open(inspectorAdapters)}
      data-test-subj="infraInspectHeaderLink"
    >
      {i18n.translate('xpack.infra.inspectButtonText', {
        defaultMessage: 'Inspect',
      })}
    </EuiHeaderLink>
  );
};
