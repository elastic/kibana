/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { Integration, IntegrationCreateRequest } from '../../../common/integrations';
import type { IntegrationAttributes } from '../../saved_objects/integrations';
import type { ClientUser } from './types';

export const savedObjectToModel = ({
  attributes,
}: SavedObject<IntegrationAttributes>): Integration => {
  return {
    id: attributes.integration_id,
    type: attributes.type,
    name: attributes.name,
    description: attributes.description,
    configuration: attributes.configuration,
    createdAt: attributes.created_at,
    updatedAt: attributes.updated_at,
    createdBy: attributes.created_by,
  };
};

export const updateToAttributes = ({
  updatedFields,
}: {
  updatedFields: Partial<Integration>;
}): Partial<IntegrationAttributes> => {
  const result: Partial<IntegrationAttributes> = {};

  if (updatedFields.name !== undefined) {
    result.name = updatedFields.name;
  }

  if (updatedFields.description !== undefined) {
    result.description = updatedFields.description;
  }

  if (updatedFields.configuration !== undefined) {
    result.configuration = updatedFields.configuration;
  }

  if (Object.keys(result).length > 0) {
    result.updated_at = new Date().toISOString();
  }

  return result;
};

export const createRequestToRaw = ({
  integration,
  id,
  user,
  creationDate,
}: {
  integration: IntegrationCreateRequest;
  id: string;
  user: ClientUser;
  creationDate: Date;
}): IntegrationAttributes => {
  const now = creationDate.toISOString();

  return {
    integration_id: id,
    type: integration.type,
    name: integration.name,
    description: integration.description,
    configuration: integration.configuration,
    created_at: now,
    updated_at: now,
    created_by: user.id,
  };
};
