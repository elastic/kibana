/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiComboBox,
  EuiCallOut,
  EuiText,
  EuiSpacer,
  useGeneratedHtmlId,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import { useEntityStoreTypes } from '../../../hooks/use_enabled_entity_types';

const MINIMUM_ENTITIES_TO_LINK = 2;

export interface LinkEntitiesModalProps {
  visible: boolean;
  onClose: () => void;
  initialEntityId?: string;
}

interface EntityOption extends EuiComboBoxOptionOption<string> {
  key: string;
}

export const LinkEntitiesModal: React.FC<LinkEntitiesModalProps> = ({
  visible,
  onClose,
  initialEntityId,
}) => {
  const modalTitleId = useGeneratedHtmlId();
  const queryClient = useQueryClient();
  const { fetchEntitiesList, linkEntities } = useEntityAnalyticsRoutes();
  const entityTypes = useEntityStoreTypes();

  const [searchValue, setSearchValue] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<EntityOption[]>(() => {
    if (initialEntityId) {
      return [{ label: initialEntityId, key: initialEntityId, value: initialEntityId }];
    }
    return [];
  });

  // Build filter query for entity name search
  const filterQuery = useMemo(() => {
    if (!searchValue) return undefined;
    return JSON.stringify({
      bool: {
        filter: [
          {
            wildcard: {
              'entity.name': `*${searchValue}*`,
            },
          },
        ],
      },
    });
  }, [searchValue]);

  // Fetch entities based on search
  const {
    data: entitiesData,
    isLoading: isLoadingEntities,
    error: entitiesError,
  } = useQuery({
    queryKey: ['entities-search-for-linking', entityTypes, searchValue],
    queryFn: async () => {
      const result = await fetchEntitiesList({
        params: {
          entityTypes,
          sortField: 'entity.name',
          sortOrder: 'asc',
          page: 1,
          perPage: 50,
          filterQuery,
        },
      });
      return result;
    },
    enabled: visible && entityTypes.length > 0,
    staleTime: 30000,
  });

  // Link entities mutation
  const linkEntitiesMutation = useMutation({
    mutationFn: async (entityIds: string[]) => {
      // For now, use the first entity type available
      // In a full implementation, entities should be of the same type
      const entityType = entityTypes[0];
      return linkEntities({
        entityType,
        entities: entityIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] });
      queryClient.invalidateQueries({ queryKey: ['resolution'] });
    },
  });

  const entityOptions: EntityOption[] = useMemo(() => {
    if (!entitiesData?.records) return [];

    return entitiesData.records
      .filter((record) => record.entity?.id)
      .map((record) => {
        const id = record.entity.id;
        const name = record.entity.name || id;
        // Show ID in label if it differs from name (e.g., has leading/trailing whitespace)
        const showId = id !== name || id !== id.trim();
        const label = showId ? `${name} (${JSON.stringify(id)})` : name;

        return {
          key: id,
          label,
          value: id,
        };
      });
  }, [entitiesData?.records]);

  const onSearchChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  const onChange = useCallback((options: EuiComboBoxOptionOption[]) => {
    setSelectedOptions(options as EntityOption[]);
  }, []);

  const handleLinkEntities = useCallback(() => {
    const entityIds = selectedOptions.map((opt) => opt.value).filter(Boolean) as string[];
    if (entityIds.length >= MINIMUM_ENTITIES_TO_LINK) {
      linkEntitiesMutation.mutate(entityIds);
    }
  }, [selectedOptions, linkEntitiesMutation]);

  const handleClose = useCallback(() => {
    setSelectedOptions([]);
    setSearchValue('');
    linkEntitiesMutation.reset();
    onClose();
  }, [onClose, linkEntitiesMutation]);

  const canSubmit =
    selectedOptions.length >= MINIMUM_ENTITIES_TO_LINK && !linkEntitiesMutation.isLoading;

  if (!visible) {
    return null;
  }

  return (
    <EuiModal
      onClose={handleClose}
      aria-labelledby={modalTitleId}
      data-test-subj="linkEntitiesModal"
      style={{ width: 600 }}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.resolution.linkModal.title"
            defaultMessage="Link Entities"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem>
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.resolution.linkModal.description"
                defaultMessage="Select two or more entities that represent the same real-world identity. These entities will be grouped together with a shared resolution ID."
              />
            </EuiText>
          </EuiFlexItem>

          <EuiSpacer size="s" />

          <EuiFlexItem>
            <EuiComboBox
              placeholder={i18n.translate(
                'xpack.securitySolution.entityAnalytics.resolution.linkModal.searchPlaceholder',
                {
                  defaultMessage: 'Search for entities by name...',
                }
              )}
              options={entityOptions}
              selectedOptions={selectedOptions}
              onChange={onChange}
              onSearchChange={onSearchChange}
              isLoading={isLoadingEntities}
              async
              data-test-subj="linkEntitiesComboBox"
              fullWidth
            />
          </EuiFlexItem>

          {entitiesError ? (
            <EuiFlexItem>
              <EuiCallOut
                title={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.resolution.linkModal.searchError',
                  {
                    defaultMessage: 'Error loading entities',
                  }
                )}
                color="danger"
                iconType="error"
                size="s"
              >
                <p>{String(entitiesError)}</p>
              </EuiCallOut>
            </EuiFlexItem>
          ) : null}

          {linkEntitiesMutation.error ? (
            <EuiFlexItem>
              <EuiCallOut
                title={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.resolution.linkModal.linkError',
                  {
                    defaultMessage: 'Error linking entities',
                  }
                )}
                color="danger"
                iconType="error"
                size="s"
              >
                <p>{String(linkEntitiesMutation.error)}</p>
              </EuiCallOut>
            </EuiFlexItem>
          ) : null}

          {selectedOptions.length > 0 && selectedOptions.length < MINIMUM_ENTITIES_TO_LINK && (
            <EuiFlexItem>
              <EuiCallOut
                title={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.resolution.linkModal.minEntitiesWarning',
                  {
                    defaultMessage: 'Select at least {count} entities to link',
                    values: { count: MINIMUM_ENTITIES_TO_LINK },
                  }
                )}
                color="warning"
                iconType="warning"
                size="s"
              />
            </EuiFlexItem>
          )}

          {linkEntitiesMutation.isSuccess && linkEntitiesMutation.data && (
            <EuiFlexItem>
              <EuiCallOut
                title={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.resolution.linkModal.successTitle',
                  {
                    defaultMessage: 'Entities linked successfully',
                  }
                )}
                color="success"
                iconType="check"
                size="s"
              >
                <p>
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.resolution.linkModal.successMessage"
                    defaultMessage="Resolution ID: {resolutionId}"
                    values={{ resolutionId: linkEntitiesMutation.data.resolution_id }}
                  />
                </p>
              </EuiCallOut>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={handleClose} data-test-subj="linkEntitiesCancelButton">
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.resolution.linkModal.cancel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={handleLinkEntities}
              fill
              isDisabled={!canSubmit}
              isLoading={linkEntitiesMutation.isLoading}
              data-test-subj="linkEntitiesSubmitButton"
            >
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.resolution.linkModal.linkButton"
                defaultMessage="Link Entities"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
