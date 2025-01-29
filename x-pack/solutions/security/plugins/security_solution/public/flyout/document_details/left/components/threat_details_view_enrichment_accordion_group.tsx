/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { EuiSpacer } from '@elastic/eui';

import { EnrichmentAccordion } from './threat_details_view_enrichment_accordion';
import type { CtiEnrichment } from '../../../../../common/search_strategy';
import { getFirstSeen } from '../../shared/utils/threat_intelligence';

export interface EnrichmentAccordionGroupProps {
  /**
   * Enrichment data
   */
  enrichments: CtiEnrichment[];
}

/**
 * Displays multiple accordions that each show the enrichment data
 */
export const EnrichmentAccordionGroup = memo(({ enrichments }: EnrichmentAccordionGroupProps) => (
  <>
    {enrichments
      .sort((a, b) => getFirstSeen(b) - getFirstSeen(a))
      .map((enrichment, index) => (
        <React.Fragment key={`${enrichment.id}`}>
          <EnrichmentAccordion enrichment={enrichment} index={index} />
          {index < enrichments.length - 1 && <EuiSpacer size="m" />}
        </React.Fragment>
      ))}
  </>
));

EnrichmentAccordionGroup.displayName = 'EnrichmentAccordionGroup';
