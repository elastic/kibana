/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { useDocumentDetailsContext } from '../../shared/context';
import type { IdentityFields } from '../../shared/utils';
import {
  getField,
  resolveHostNameForEntityInsightsWithFallback,
  resolveUserNameForEntityInsightsWithFallback,
} from '../../shared/utils';
import { EntitiesDetailsView } from '../../../../flyout_v2/entities/components/entities_details_view';
import { ENTITIES_DETAILS_TEST_ID } from './test_ids';

export const ENTITIES_TAB_ID = 'entity';

/**
 * Entities displayed in the document details expandable flyout left section under the Insights tab
 */
export const EntitiesDetails: React.FC = () => {
  const { scopeId, dataAsNestedObject, searchHit, getFieldsData } = useDocumentDetailsContext();
  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);
  const timestamp = getField(getFieldsData('@timestamp'));

  const euidApi = useEntityStoreEuidApi();
  const userEntityIdentifiers = euidApi?.euid.getEntityIdentifiersFromDocument(
    'user',
    dataAsNestedObject
  ) as IdentityFields;
  const hostEntityIdentifiers = euidApi?.euid.getEntityIdentifiersFromDocument(
    'host',
    dataAsNestedObject
  ) as IdentityFields;

  const userName = resolveUserNameForEntityInsightsWithFallback(
    userEntityIdentifiers,
    getFieldsData
  );
  const hostName = resolveHostNameForEntityInsightsWithFallback(
    hostEntityIdentifiers,
    getFieldsData
  );

  return (
    <div data-test-subj={ENTITIES_DETAILS_TEST_ID}>
      <EntitiesDetailsView
        hit={hit}
        dataAsNestedObject={dataAsNestedObject}
        scopeId={scopeId}
        timestamp={timestamp ?? null}
        hostName={hostName ?? null}
        userName={userName ?? null}
      />
    </div>
  );
};

EntitiesDetails.displayName = 'EntitiesDetails';
