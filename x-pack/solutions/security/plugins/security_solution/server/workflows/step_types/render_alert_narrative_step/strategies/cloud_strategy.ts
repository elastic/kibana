/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NarrativeStrategy } from '../narrative_strategy';
import {
  getSingleValue,
  normalizeSpaces,
  appendAlertSuffix,
} from '../narrative_utils';
import type { AlertSource } from '../narrative_utils';

export const buildCloudNarrative = (source: AlertSource): string => {
  const provider = getSingleValue(source, 'cloud.provider');
  const region = getSingleValue(source, 'cloud.region');
  const accountId = getSingleValue(source, 'cloud.account.id');
  const serviceName = getSingleValue(source, 'cloud.service.name');
  const eventAction = getSingleValue(source, 'event.action');

  const awsArn = getSingleValue(source, 'aws.cloudtrail.user_identity.arn');
  const awsIdentityType = getSingleValue(source, 'aws.cloudtrail.user_identity.type');
  const awsEventType = getSingleValue(source, 'aws.cloudtrail.event_type');
  const awsErrorCode = getSingleValue(source, 'aws.cloudtrail.error_code');

  const azurePrincipal = getSingleValue(
    source,
    'azure.auditlogs.properties.initiated_by.user.user_principal_name'
  );
  const azureActivityUser = getSingleValue(
    source,
    'azure.activitylogs.identity.claims_initiated_by_user.name'
  );

  const gcpEmail = getSingleValue(source, 'gcp.audit.authentication_info.principal_email');
  const gcpMethod = getSingleValue(source, 'gcp.audit.method_name');
  const gcpResource = getSingleValue(source, 'gcp.audit.resource_name');

  const outcome = getSingleValue(source, 'event.outcome');

  let text = `${provider ?? 'cloud'} event`;

  if (eventAction != null) text += ` ${eventAction}`;

  const principal = awsArn ?? azurePrincipal ?? azureActivityUser ?? gcpEmail;
  if (principal != null) text += ` by ${principal}`;
  if (awsIdentityType != null) text += ` (${awsIdentityType})`;

  if (awsEventType != null) text += `, event type ${awsEventType}`;
  if (gcpMethod != null) text += `, method ${gcpMethod}`;
  if (gcpResource != null) text += ` on resource ${gcpResource}`;
  if (serviceName != null) text += `, service ${serviceName}`;
  if (accountId != null) text += `, account ${accountId}`;
  if (region != null) text += `, region ${region}`;

  if (outcome != null) text += ` with result ${outcome}`;
  if (awsErrorCode != null) text += ` (error: ${awsErrorCode})`;

  text = appendAlertSuffix(text, source);

  return normalizeSpaces(text);
};

export const cloudStrategy: NarrativeStrategy = {
  id: 'cloud',
  priority: 60,
  match: (source) =>
    getSingleValue(source, 'cloud.provider') != null ||
    getSingleValue(source, 'aws.cloudtrail.user_identity.arn') != null ||
    getSingleValue(
      source,
      'azure.auditlogs.properties.initiated_by.user.user_principal_name'
    ) != null ||
    getSingleValue(source, 'gcp.audit.authentication_info.principal_email') != null,
  build: buildCloudNarrative,
};
