/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';

export const useReadOnlyBadge = (isReadOnly = false) => {
  const chrome = useKibana().services.chrome;

  useEffect(() => {
    chrome?.setBadge(
      isReadOnly
        ? {
            text: i18n.translate('xpack.infra.header.badge.readOnly.text', {
              defaultMessage: 'Read only',
            }),
            tooltip: i18n.translate('xpack.infra.header.badge.readOnly.tooltip', {
              defaultMessage: 'Unable to change source configuration',
            }),
            iconType: 'glasses',
          }
        : undefined
    );
  }, [chrome, isReadOnly]);

  return null;
};
