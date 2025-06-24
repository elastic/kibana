/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { ApiKeyFlyout } from '@kbn/security-api-key-management';
import {
  SecurityCreateApiKeyResponse,
  SecurityUpdateApiKeyResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { AuthenticatedUser } from '@kbn/core/public';

const DEFAULT_ROLE_DESCRIPTORS = `{
  "serverless_search": {
    "indices": [{
      "names": ["*"],
      "privileges": [
        "all"
      ]
    }]
  }
}`;
const DEFAULT_METADATA = `{
  "application": "myapp"
}`;

interface CreateApiKeyFlyoutProps {
  onClose: () => void;
  setApiKey: (apiKey: SecurityCreateApiKeyResponse | SecurityUpdateApiKeyResponse) => void;
  user?: AuthenticatedUser;
}

export const CreateApiKeyFlyout: React.FC<CreateApiKeyFlyoutProps> = ({
  onClose,
  setApiKey,
  user,
}) => {
  return (
    <ApiKeyFlyout
      onCancel={onClose}
      onSuccess={setApiKey}
      apiKey={undefined}
      currentUser={user}
      defaultRoleDescriptors={DEFAULT_ROLE_DESCRIPTORS}
      defaultMetadata={DEFAULT_METADATA}
      defaultExpiration="60"
    />
  );
};
