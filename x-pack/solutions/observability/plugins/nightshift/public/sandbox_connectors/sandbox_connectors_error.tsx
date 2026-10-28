/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';

const connectorsTitle = i18n.translate('xpack.nightshift.sandboxConnectors.loadError', {
  defaultMessage: 'Could not load the connectors.',
});

/**
 * A failed connector request is not an empty space: say so and offer a retry instead of hiding
 * the section, which would read as "no connectors yet".
 */
export function SandboxConnectorsError({
  title = connectorsTitle,
  onRetry,
  'data-test-subj': dataTestSubj = 'nightshiftSandboxConnectorsError',
}: {
  title?: string;
  onRetry: () => void;
  'data-test-subj'?: string;
}): React.ReactElement {
  return (
    <KbnDangerCallout announceOnMount size="s" title={title} data-test-subj={dataTestSubj}>
      <EuiButton size="s" color="danger" onClick={onRetry} data-test-subj={`${dataTestSubj}Retry`}>
        {i18n.translate('xpack.nightshift.sandboxConnectors.retry', {
          defaultMessage: 'Retry',
        })}
      </EuiButton>
    </KbnDangerCallout>
  );
}
