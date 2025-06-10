/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import * as ruleDetailsI18n from '../../../../translations';
import { RelatedIntegrationsDescription } from '../../../../../../../common/components/related_integrations/integrations_description';
import type { RelatedIntegrationArray } from '../../../../../../../../../common/api/detection_engine';
import { EmptyFieldValuePlaceholder } from '../../empty_field_value_placeholder';

interface RelatedIntegrationsReadOnly {
  relatedIntegrations: RelatedIntegrationArray;
}

export function RelatedIntegrationsReadOnly({ relatedIntegrations }: RelatedIntegrationsReadOnly) {
  return (
    <EuiDescriptionList
      listItems={[
        {
          title: ruleDetailsI18n.RELATED_INTEGRATIONS_FIELD_LABEL,
          description: relatedIntegrations.length ? (
            <RelatedIntegrationsDescription relatedIntegrations={relatedIntegrations} />
          ) : (
            <EmptyFieldValuePlaceholder />
          ),
        },
      ]}
    />
  );
}
