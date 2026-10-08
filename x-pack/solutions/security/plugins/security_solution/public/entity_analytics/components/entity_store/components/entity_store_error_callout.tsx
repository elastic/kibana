/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EngineDescriptor } from '@kbn/entity-store/common';

type EngineError = NonNullable<EngineDescriptor['error']>;

const ErrorCallout: React.FC<{
  engineType: EngineDescriptor['type'];
  error: EngineError;
  nonPriority?: boolean;
  size: 's' | 'm';
}> = ({ engineType, error, nonPriority = false, size }) => {
  let title;
  // Please update the following code when adding a new action type
  switch (error.action) {
    case 'init':
      title = (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityStore.initError.title"
          defaultMessage="An error occurred during {engineType} entity store resource initialization"
          values={{ engineType }}
        />
      );
      break;
    case 'extractLogs':
      title = nonPriority ? (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityStore.nonPriorityExtractLogsError.title"
          defaultMessage="An error occurred during {engineType} non-priority log extraction"
          values={{ engineType }}
        />
      ) : (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityStore.extractLogsError.title"
          defaultMessage="An error occurred during {engineType} log extraction"
          values={{ engineType }}
        />
      );
      break;
  }

  return (
    <EuiCallOut title={title} color="danger" iconType="warning" size={size}>
      <p>{error.message}</p>
    </EuiCallOut>
  );
};

export const EntityStoreErrorCallout: React.FC<{ engine?: EngineDescriptor; size?: 's' | 'm' }> = ({
  engine,
  size = 'm',
}) => {
  if (!engine) {
    return null;
  }

  const { type, error, nonPriority } = engine;
  const engineError = error?.message ? error : undefined;
  // The overall store status ignores non-priority failures, so this callout is where they surface.
  const nonPriorityError = nonPriority?.error?.message ? nonPriority.error : undefined;

  if (!engineError && !nonPriorityError) {
    return null;
  }

  return (
    <>
      {engineError && <ErrorCallout engineType={type} error={engineError} size={size} />}
      {engineError && nonPriorityError && <EuiSpacer size="s" />}
      {nonPriorityError && (
        <ErrorCallout engineType={type} error={nonPriorityError} nonPriority size={size} />
      )}
    </>
  );
};
