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
  EuiBadge,
  EuiSteps,
  useGeneratedHtmlId,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type { FilterableEntity } from '../../../../../common/api/entity_analytics/entity_store/resolution/list_filterable_entities.gen';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import { useEntityStoreTypes } from '../../../hooks/use_enabled_entity_types';

export interface LinkEntitiesModalProps {
  visible: boolean;
  onClose: () => void;
  initialEntityId?: string;
}

interface EntityOption extends EuiComboBoxOptionOption<FilterableEntity> {
  key: string;
}

const formatEntityLabel = (entity: FilterableEntity): string => {
  const { id, name, is_primary, resolved_count } = entity;
  // Show ID in label if it differs from name
  const showId = id !== name || id !== id.trim();
  let label = showId ? `${name} (${JSON.stringify(id)})` : name;

  if (is_primary && resolved_count && resolved_count > 0) {
    label += ` [Primary - ${resolved_count} linked]`;
  }
  return label;
};

const entityToOption = (entity: FilterableEntity): EntityOption => ({
  key: entity.id,
  label: formatEntityLabel(entity),
  value: entity,
});

export const LinkEntitiesModal: React.FC<LinkEntitiesModalProps> = ({
  visible,
  onClose,
  initialEntityId,
}) => {
  const modalTitleId = useGeneratedHtmlId();
  const queryClient = useQueryClient();
  const { fetchFilterableEntities, linkEntities } = useEntityAnalyticsRoutes();
  const entityTypes = useEntityStoreTypes();

  // Step tracking (1 = select primary, 2 = select entities to link)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Step 1: Primary entity selection
  const [primarySearchValue, setPrimarySearchValue] = useState('');
  const [selectedPrimary, setSelectedPrimary] = useState<EntityOption | null>(null);

  // Step 2: Entities to link selection
  const [linkSearchValue, setLinkSearchValue] = useState('');
  const [selectedEntitiesToLink, setSelectedEntitiesToLink] = useState<EntityOption[]>(() => {
    // If initialEntityId is provided, pre-populate it
    if (initialEntityId) {
      return [
        {
          key: initialEntityId,
          label: initialEntityId,
          value: { id: initialEntityId, name: initialEntityId, type: entityTypes[0] || 'user' },
        },
      ];
    }
    return [];
  });

  const entityType = entityTypes[0] || 'user';

  // Step 1: Fetch primaries and unresolved entities for primary selection
  const {
    data: primaryEntitiesData,
    isLoading: isLoadingPrimaryEntities,
    error: primaryEntitiesError,
  } = useQuery({
    queryKey: ['filterable-entities-primary', entityType, primarySearchValue],
    queryFn: async () => {
      return fetchFilterableEntities({
        entityType,
        filter: 'primaries_and_unresolved',
        searchTerm: primarySearchValue || undefined,
        limit: 50,
      });
    },
    enabled: visible && currentStep === 1,
    staleTime: 30000,
  });

  // Step 2: Fetch unresolved entities for linking (excluding selected primary)
  const {
    data: linkEntitiesData,
    isLoading: isLoadingLinkEntities,
    error: linkEntitiesError,
  } = useQuery({
    queryKey: ['filterable-entities-link', entityType, linkSearchValue, selectedPrimary?.key],
    queryFn: async () => {
      return fetchFilterableEntities({
        entityType,
        filter: 'unresolved_only',
        excludeEntityId: selectedPrimary?.key,
        searchTerm: linkSearchValue || undefined,
        limit: 50,
      });
    },
    enabled: visible && currentStep === 2 && selectedPrimary !== null,
    staleTime: 30000,
  });

  // Link entities mutation
  const linkEntitiesMutation = useMutation({
    mutationFn: async ({
      primaryEntityId,
      entityIds,
    }: {
      primaryEntityId: string;
      entityIds: string[];
    }) => {
      return linkEntities({
        entityType,
        primaryEntityId,
        entities: entityIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] });
      queryClient.invalidateQueries({ queryKey: ['resolution'] });
      queryClient.invalidateQueries({ queryKey: ['filterable-entities-primary'] });
      queryClient.invalidateQueries({ queryKey: ['filterable-entities-link'] });
      queryClient.invalidateQueries({ queryKey: ['grouped-entities'] });
    },
  });

  // Build options for step 1 (primary selection)
  const primaryOptions: EntityOption[] = useMemo(() => {
    if (!primaryEntitiesData?.entities) return [];
    return primaryEntitiesData.entities.map(entityToOption);
  }, [primaryEntitiesData?.entities]);

  // Build options for step 2 (entities to link)
  const linkOptions: EntityOption[] = useMemo(() => {
    if (!linkEntitiesData?.entities) return [];
    return linkEntitiesData.entities.map(entityToOption);
  }, [linkEntitiesData?.entities]);

  // Step 1 handlers
  const onPrimarySearchChange = useCallback((value: string) => {
    setPrimarySearchValue(value);
  }, []);

  const onPrimaryChange = useCallback((options: EuiComboBoxOptionOption[]) => {
    const selected = options[0] as EntityOption | undefined;
    setSelectedPrimary(selected || null);
  }, []);

  // Step 2 handlers
  const onLinkSearchChange = useCallback((value: string) => {
    setLinkSearchValue(value);
  }, []);

  const onLinkEntitiesChange = useCallback((options: EuiComboBoxOptionOption[]) => {
    setSelectedEntitiesToLink(options as EntityOption[]);
  }, []);

  // Navigation
  const handleNextStep = useCallback(() => {
    if (selectedPrimary) {
      setCurrentStep(2);
    }
  }, [selectedPrimary]);

  const handleBackStep = useCallback(() => {
    setCurrentStep(1);
    linkEntitiesMutation.reset();
  }, [linkEntitiesMutation]);

  // Submit
  const handleLinkEntities = useCallback(() => {
    if (!selectedPrimary) return;

    const entityIds = selectedEntitiesToLink
      .map((opt) => opt.value?.id)
      .filter((id): id is string => Boolean(id));

    if (entityIds.length >= 1) {
      linkEntitiesMutation.mutate({
        primaryEntityId: selectedPrimary.key,
        entityIds,
      });
    }
  }, [selectedPrimary, selectedEntitiesToLink, linkEntitiesMutation]);

  // Close and reset
  const handleClose = useCallback(() => {
    setCurrentStep(1);
    setSelectedPrimary(null);
    setSelectedEntitiesToLink([]);
    setPrimarySearchValue('');
    setLinkSearchValue('');
    linkEntitiesMutation.reset();
    onClose();
  }, [onClose, linkEntitiesMutation]);

  const canProceedToStep2 = selectedPrimary !== null;
  const canSubmit = selectedEntitiesToLink.length >= 1 && !linkEntitiesMutation.isLoading;

  if (!visible) {
    return null;
  }

  const step1Content = (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.resolution.linkModal.step1Description"
            defaultMessage="Select the primary entity that will be the 'golden record' for this resolution group. You can select an existing primary or an unresolved entity."
          />
        </EuiText>
      </EuiFlexItem>

      <EuiSpacer size="s" />

      <EuiFlexItem>
        <EuiComboBox
          placeholder={i18n.translate(
            'xpack.securitySolution.entityAnalytics.resolution.linkModal.primaryPlaceholder',
            {
              defaultMessage: 'Search for primary entity...',
            }
          )}
          options={primaryOptions}
          selectedOptions={selectedPrimary ? [selectedPrimary] : []}
          onChange={onPrimaryChange}
          onSearchChange={onPrimarySearchChange}
          isLoading={isLoadingPrimaryEntities}
          singleSelection={{ asPlainText: true }}
          async
          data-test-subj="linkEntitiesPrimaryComboBox"
          fullWidth
        />
      </EuiFlexItem>

      {primaryEntitiesError && (
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
            <p>{String(primaryEntitiesError)}</p>
          </EuiCallOut>
        </EuiFlexItem>
      )}

      {selectedPrimary && selectedPrimary.value?.is_primary && (
        <EuiFlexItem>
          <EuiCallOut
            title={i18n.translate(
              'xpack.securitySolution.entityAnalytics.resolution.linkModal.existingPrimaryInfo',
              {
                defaultMessage: 'This entity is already a primary',
              }
            )}
            color="primary"
            iconType="iInCircle"
            size="s"
          >
            <p>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.resolution.linkModal.existingPrimaryMessage"
                defaultMessage="Entities you select in step 2 will be added to this existing resolution group."
              />
            </p>
          </EuiCallOut>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );

  const step2Content = (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.resolution.linkModal.step2SelectedPrimary"
                defaultMessage="Primary:"
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="primary">{selectedPrimary?.label}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.resolution.linkModal.step2Description"
            defaultMessage="Select the entities you want to link to this primary. Only unresolved entities are shown."
          />
        </EuiText>
      </EuiFlexItem>

      <EuiSpacer size="s" />

      <EuiFlexItem>
        <EuiComboBox
          placeholder={i18n.translate(
            'xpack.securitySolution.entityAnalytics.resolution.linkModal.linkPlaceholder',
            {
              defaultMessage: 'Search for entities to link...',
            }
          )}
          options={linkOptions}
          selectedOptions={selectedEntitiesToLink}
          onChange={onLinkEntitiesChange}
          onSearchChange={onLinkSearchChange}
          isLoading={isLoadingLinkEntities}
          async
          data-test-subj="linkEntitiesLinkComboBox"
          fullWidth
        />
      </EuiFlexItem>

      {linkEntitiesError && (
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
            <p>{String(linkEntitiesError)}</p>
          </EuiCallOut>
        </EuiFlexItem>
      )}

      {linkEntitiesMutation.error && (
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
      )}

      {selectedEntitiesToLink.length === 0 && (
        <EuiFlexItem>
          <EuiCallOut
            title={i18n.translate(
              'xpack.securitySolution.entityAnalytics.resolution.linkModal.selectEntitiesWarning',
              {
                defaultMessage: 'Select at least one entity to link',
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
  );

  const steps = [
    {
      title: i18n.translate(
        'xpack.securitySolution.entityAnalytics.resolution.linkModal.step1Title',
        {
          defaultMessage: 'Select Primary Entity',
        }
      ),
      status: currentStep === 1 ? ('current' as const) : ('complete' as const),
      children: currentStep === 1 ? step1Content : null,
    },
    {
      title: i18n.translate(
        'xpack.securitySolution.entityAnalytics.resolution.linkModal.step2Title',
        {
          defaultMessage: 'Select Entities to Link',
        }
      ),
      status:
        currentStep === 2
          ? ('current' as const)
          : currentStep === 1
          ? ('incomplete' as const)
          : ('complete' as const),
      children: currentStep === 2 ? step2Content : null,
    },
  ];

  return (
    <EuiModal
      onClose={handleClose}
      aria-labelledby={modalTitleId}
      data-test-subj="linkEntitiesModal"
      style={{ width: 650 }}
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
        <EuiSteps steps={steps} titleSize="xs" />
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            {currentStep === 2 && (
              <EuiButtonEmpty
                onClick={handleBackStep}
                data-test-subj="linkEntitiesBackButton"
                isDisabled={linkEntitiesMutation.isLoading}
              >
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.resolution.linkModal.back"
                  defaultMessage="Back"
                />
              </EuiButtonEmpty>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={handleClose} data-test-subj="linkEntitiesCancelButton">
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.resolution.linkModal.cancel"
                    defaultMessage="Cancel"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {currentStep === 1 ? (
                  <EuiButton
                    onClick={handleNextStep}
                    fill
                    isDisabled={!canProceedToStep2}
                    data-test-subj="linkEntitiesNextButton"
                  >
                    <FormattedMessage
                      id="xpack.securitySolution.entityAnalytics.resolution.linkModal.next"
                      defaultMessage="Next"
                    />
                  </EuiButton>
                ) : (
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
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
