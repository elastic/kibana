/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../hooks/use_kibana';

export const CreateIndexCalloutBrowseIntegrationBtn = () => {
  const { http } = useKibana().services;

  const analyzeLogsIntegration = useMemo(() => {
    return http.basePath.prepend('/app/integrations/browse/observability');
  }, [http]);

  return (
    <EuiButtonEmpty
      color="text"
      iconSide="right"
      iconType="popout"
      data-test-subj="analyzeLogsBrowseIntegrations"
      href={analyzeLogsIntegration}
      target="_blank"
    >
      {i18n.translate(
        'xpack.searchIndices.shared.createIndex.observabilityCallout.logs.browseIntegration.button',
        {
          defaultMessage: 'Collect and analyze logs',
        }
      )}
    </EuiButtonEmpty>
  );
};
