/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DecisionTreeAttachmentData } from '../../common/decision_trees';

export const decisionTreeLabel = ({
  title,
  symptom,
  version,
}: DecisionTreeAttachmentData): string =>
  i18n.translate('xpack.nightshiftInvestigations.decisionTreeAttachment.label', {
    defaultMessage: '{title} · v{version}',
    values: { title: title || symptom, version },
  });
