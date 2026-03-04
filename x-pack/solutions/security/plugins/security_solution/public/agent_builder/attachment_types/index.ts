/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { createRuleAttachmentDefinition } from './rule_attachment';

export const registerAttachmentUiDefinitions = ({
  attachments,
  application,
}: {
  attachments: AttachmentServiceStartContract;
  application: ApplicationStart;
}) => {
  attachments.addAttachmentType(
    SecurityAgentBuilderAttachments.rule,
    createRuleAttachmentDefinition({ application })
  );
};
