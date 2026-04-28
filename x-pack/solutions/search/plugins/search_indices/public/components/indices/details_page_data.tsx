/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiHorizontalRule,
} from '@elastic/eui';
import { EisCloudConnectPromoCallout, EisUpdateCallout } from '@kbn/search-api-panels';
import { CLOUD_CONNECT_NAV_ID } from '@kbn/deeplinks-management/constants';

import type { UserStartPrivilegesResponse } from '../../../common';
import { useKibana } from '../../hooks/use_kibana';
import type { IndexDocuments as IndexDocumentsType } from '../../hooks/api/use_document_search';
import { IndexDocuments } from '../index_documents/index_documents';
import { IndexSearchExample } from './details_search_example';
import { docLinks } from '../../../common/doc_links';
import { UpdateElserMappingsModal } from '../update_elser_mappings/update_elser_mappings_modal';
import { flattenMappings, hasElserOnMlNodeSemanticTextField } from '../update_elser_mappings/utils';
import type { NormalizedFields } from '../update_elser_mappings/types';
import { useLicense } from '../../hooks/use_license';
import type { Mappings } from '../../types';

interface IndexDetailsDataProps {
  indexName: string;
  indexDocuments?: IndexDocumentsType;
  isInitialLoading: boolean;
  navigateToPlayground: () => void;
  userPrivileges?: UserStartPrivilegesResponse;
  mappingData: Mappings | undefined;
}

export const IndexDetailsData = ({
  indexName,
  indexDocuments,
  isInitialLoading,
  navigateToPlayground,
  userPrivileges,
  mappingData,
}: IndexDetailsDataProps) => {
  const { application, cloud } = useKibana().services;
  const { isAtLeastEnterprise } = useLicense();
  const [isUpdatingElserMappings, setIsUpdatingElserMappings] = useState<boolean>(false);

  const documents = indexDocuments?.results?.data ?? [];

  const shouldShowEisUpdateCallout =
    (cloud?.isCloudEnabled && (isAtLeastEnterprise() || cloud?.isServerlessEnabled)) ?? false;

  const fieldsForUpdate = useMemo<NormalizedFields['byId'] | undefined>(() => {
    const properties = mappingData?.mappings?.properties;
    if (properties && Object.keys(properties).length > 0) {
      const flattenedMappings = flattenMappings(properties);
      if (hasElserOnMlNodeSemanticTextField(flattenedMappings)) {
        return flattenedMappings;
      }
    }
    // Return undefined when there are no ELSER fields on ML node to update
    return undefined;
  }, [mappingData]);

  if (isInitialLoading) {
    return (
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
        <EuiSpacer />
        <EuiProgress size="xs" color="primary" />
      </EuiPanel>
    );
  }

  return (
    <>
      <EisCloudConnectPromoCallout
        promoId="indexDetailsData"
        isSelfManaged={!cloud?.isCloudEnabled}
        direction="row"
        navigateToApp={() =>
          application.navigateToApp(CLOUD_CONNECT_NAV_ID, { openInNewTab: true })
        }
        addSpacer="top"
      />
      {fieldsForUpdate && (
        <EisUpdateCallout
          ctaLink={docLinks.elasticInferenceService}
          promoId="indexDetailsData"
          shouldShowEisUpdateCallout={shouldShowEisUpdateCallout}
          handleOnClick={() => setIsUpdatingElserMappings(true)}
          direction="row"
          hasUpdatePrivileges={userPrivileges?.privileges.canManageIndex}
          addSpacer="top"
        />
      )}
      {isUpdatingElserMappings && fieldsForUpdate && (
        <UpdateElserMappingsModal
          indexName={indexName}
          setIsModalOpen={setIsUpdatingElserMappings}
          hasUpdatePrivileges={userPrivileges?.privileges.canManageIndex}
          mappings={fieldsForUpdate}
        />
      )}
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
        <EuiSpacer />
        <EuiFlexGroup direction="column" gutterSize="s">
          {documents.length > 0 && (
            <>
              <EuiFlexItem>
                <IndexSearchExample
                  indexName={indexName}
                  documents={documents}
                  mappings={mappingData}
                  navigateToPlayground={navigateToPlayground}
                />
              </EuiFlexItem>
              <EuiHorizontalRule />
            </>
          )}
          <EuiFlexItem>
            <IndexDocuments
              indexName={indexName}
              documents={documents}
              mappings={mappingData}
              userPrivileges={userPrivileges}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
};
