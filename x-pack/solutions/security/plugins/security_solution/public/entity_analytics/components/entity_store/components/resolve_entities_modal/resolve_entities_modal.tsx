/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
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
  EuiFieldSearch,
  EuiText,
  EuiLoadingSpinner,
  EuiCallOut,
  EuiCheckbox,
  EuiBadge,
  EuiIcon,
  EuiPanel,
  EuiSteps,
  useGeneratedHtmlId,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useQuery, useMutation, useQueryClient } from '@kbn/react-query';
import useDebounce from 'react-use/lib/useDebounce';
import type { EntityType } from '../../../../../../common/api/entity_analytics';
import type { FilterableEntity } from '../../../../../../common/api/entity_analytics/entity_store/resolution';
import { useEntityStoreRoutes } from '../../../../api/entity_store';

export interface ResolveEntitiesModalProps {
  visible: boolean;
  onClose: () => void;
  entityType: EntityType;
}

type Step = 'primary' | 'secondary';

const SEARCH_DEBOUNCE_MS = 300;

export const ResolveEntitiesModal: React.FC<ResolveEntitiesModalProps> = ({
  visible,
  onClose,
  entityType,
}) => {
  const { euiTheme } = useEuiTheme();
  const modalTitleId = useGeneratedHtmlId();
  const queryClient = useQueryClient();
  const { listFilterableEntities, linkEntities } = useEntityStoreRoutes();

  // State
  const [currentStep, setCurrentStep] = useState<Step>('primary');
  const [selectedPrimary, setSelectedPrimary] = useState<FilterableEntity | null>(null);
  const [selectedSecondaries, setSelectedSecondaries] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useDebounce(() => setDebouncedSearchTerm(searchTerm), SEARCH_DEBOUNCE_MS, [searchTerm]);

  // Query for entities
  const {
    data: entitiesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      'filterable-entities',
      entityType,
      currentStep,
      selectedPrimary?.id,
      debouncedSearchTerm,
    ],
    queryFn: () =>
      listFilterableEntities({
        entityType,
        excludeEntityId: currentStep === 'secondary' ? selectedPrimary?.id : undefined,
        searchTerm: debouncedSearchTerm || undefined,
        limit: 50,
      }),
    enabled: visible,
  });

  // Mutation for linking entities
  const linkMutation = useMutation({
    mutationFn: () => {
      if (!selectedPrimary) {
        return Promise.reject(new Error('No primary entity selected'));
      }
      return linkEntities({
        entityType,
        primaryEntityId: selectedPrimary.id,
        secondaryEntityIds: Array.from(selectedSecondaries),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filterable-entities'] });
      handleClose();
    },
  });

  const handleClose = useCallback(() => {
    setCurrentStep('primary');
    setSelectedPrimary(null);
    setSelectedSecondaries(new Set());
    setSearchTerm('');
    setDebouncedSearchTerm('');
    onClose();
  }, [onClose]);

  const handlePrimarySelect = useCallback((entity: FilterableEntity) => {
    setSelectedPrimary(entity);
  }, []);

  const handleSecondaryToggle = useCallback((entityId: string) => {
    setSelectedSecondaries((prev) => {
      const next = new Set(prev);
      if (next.has(entityId)) {
        next.delete(entityId);
      } else {
        next.add(entityId);
      }
      return next;
    });
  }, []);

  const handleNext = useCallback(() => {
    setCurrentStep('secondary');
    setSearchTerm('');
    setDebouncedSearchTerm('');
  }, []);

  const handleBack = useCallback(() => {
    setCurrentStep('primary');
    setSelectedSecondaries(new Set());
    setSearchTerm('');
    setDebouncedSearchTerm('');
  }, []);

  const handleResolve = useCallback(() => {
    linkMutation.mutate();
  }, [linkMutation]);

  const entities = useMemo(() => entitiesData?.entities ?? [], [entitiesData]);

  // Styles
  const entityCardStyles = useMemo(
    () => css`
      padding: ${euiTheme.size.m};
      margin-bottom: ${euiTheme.size.s};
      border-radius: ${euiTheme.border.radius.medium};
      border: 1px solid ${euiTheme.colors.lightShade};
      cursor: pointer;
      transition: all 0.15s ease-in-out;

      &:hover {
        border-color: ${euiTheme.colors.primary};
        background-color: ${euiTheme.colors.lightestShade};
      }
    `,
    [euiTheme]
  );

  const selectedCardStyles = useMemo(
    () => css`
      border-color: ${euiTheme.colors.primary};
      background-color: ${euiTheme.colors.lightestShade};
      box-shadow: 0 0 0 1px ${euiTheme.colors.primary};
    `,
    [euiTheme]
  );

  const stepIndicatorStyles = useMemo(
    () => css`
      .euiStepNumber {
        background-color: ${euiTheme.colors.primary};
      }
    `,
    [euiTheme]
  );

  const listContainerStyles = useMemo(
    () => css`
      max-height: 350px;
      overflow-y: auto;
      padding: ${euiTheme.size.s};
      border: 1px solid ${euiTheme.colors.lightShade};
      border-radius: ${euiTheme.border.radius.medium};
      background: ${euiTheme.colors.emptyShade};
    `,
    [euiTheme]
  );

  if (!visible) {
    return null;
  }

  const stepConfig: Array<{
    title: string;
    status: 'complete' | 'incomplete' | 'current';
    children: React.ReactNode;
  }> = [
    {
      title: i18n.translate('xpack.securitySolution.entityAnalytics.resolution.modal.step1.title', {
        defaultMessage: 'Select Primary Entity',
      }),
      status: currentStep === 'primary' ? 'current' : 'complete',
      children:
        currentStep === 'primary' ? null : (
          <EuiText size="s" color="success">
            <EuiIcon type="check" /> {selectedPrimary?.name}
          </EuiText>
        ),
    },
    {
      title: i18n.translate('xpack.securitySolution.entityAnalytics.resolution.modal.step2.title', {
        defaultMessage: 'Select Entities to Resolve',
      }),
      status: currentStep === 'secondary' ? 'current' : 'incomplete',
      children: null,
    },
  ];

  return (
    <EuiModal
      onClose={handleClose}
      aria-labelledby={modalTitleId}
      data-test-subj="resolveEntitiesModal"
      style={{ width: 600 }}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.resolution.modal.title"
            defaultMessage="Resolve Entities"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiFlexGroup direction="column" gutterSize="m">
          {/* Step Indicator */}
          <EuiFlexItem grow={false}>
            <div css={stepIndicatorStyles}>
              <EuiSteps steps={stepConfig} headingElement="h3" />
            </div>
          </EuiFlexItem>

          {/* Search */}
          <EuiFlexItem grow={false}>
            <EuiFieldSearch
              placeholder={
                currentStep === 'primary'
                  ? i18n.translate(
                      'xpack.securitySolution.entityAnalytics.resolution.modal.searchPrimary',
                      { defaultMessage: 'Search for primary entity...' }
                    )
                  : i18n.translate(
                      'xpack.securitySolution.entityAnalytics.resolution.modal.searchSecondary',
                      { defaultMessage: 'Search entities to resolve...' }
                    )
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              isClearable
              fullWidth
              data-test-subj="resolveEntitiesSearch"
            />
          </EuiFlexItem>

          {/* Entity List */}
          <EuiFlexItem>
            {isLoading ? (
              <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="l" />
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : error ? (
              <EuiCallOut
                title={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.resolution.modal.error',
                  { defaultMessage: 'Error loading entities' }
                )}
                color="danger"
                iconType="error"
              >
                <p>{(error as Error).message}</p>
              </EuiCallOut>
            ) : entities.length === 0 ? (
              <EuiCallOut
                title={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.resolution.modal.noEntities',
                  { defaultMessage: 'No entities found' }
                )}
                color="warning"
                iconType="search"
              />
            ) : (
              <div css={listContainerStyles}>
                {entities.map((entity) => (
                  <EntityCard
                    key={entity.id}
                    entity={entity}
                    isSelected={
                      currentStep === 'primary'
                        ? selectedPrimary?.id === entity.id
                        : selectedSecondaries.has(entity.id)
                    }
                    isCheckbox={currentStep === 'secondary'}
                    onSelect={
                      currentStep === 'primary'
                        ? () => handlePrimarySelect(entity)
                        : () => handleSecondaryToggle(entity.id)
                    }
                    cardStyles={entityCardStyles}
                    selectedStyles={selectedCardStyles}
                  />
                ))}
              </div>
            )}
          </EuiFlexItem>

          {/* Info callout for step 2 */}
          {currentStep === 'secondary' && selectedPrimary && selectedSecondaries.size > 0 && (
            <EuiFlexItem grow={false}>
              <EuiCallOut
                size="s"
                iconType="iInCircle"
                title={
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.resolution.modal.resolveInfo"
                    defaultMessage="{count} {count, plural, one {entity} other {entities}} will be resolved to {primary}"
                    values={{
                      count: selectedSecondaries.size,
                      primary: <strong>{selectedPrimary.name}</strong>,
                    }}
                  />
                }
              />
            </EuiFlexItem>
          )}

          {/* Link mutation error */}
          {linkMutation.isError && (
            <EuiFlexItem grow={false}>
              <EuiCallOut
                title={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.resolution.modal.linkError',
                  { defaultMessage: 'Error linking entities' }
                )}
                color="danger"
                iconType="error"
              >
                <p>{(linkMutation.error as Error).message}</p>
              </EuiCallOut>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            {currentStep === 'secondary' && (
              <EuiButtonEmpty onClick={handleBack} data-test-subj="resolveEntitiesBackButton">
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.resolution.modal.back"
                  defaultMessage="Back"
                />
              </EuiButtonEmpty>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={handleClose} data-test-subj="resolveEntitiesCancelButton">
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.resolution.modal.cancel"
                    defaultMessage="Cancel"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {currentStep === 'primary' ? (
                  <EuiButton
                    onClick={handleNext}
                    fill
                    disabled={!selectedPrimary}
                    data-test-subj="resolveEntitiesNextButton"
                  >
                    <FormattedMessage
                      id="xpack.securitySolution.entityAnalytics.resolution.modal.next"
                      defaultMessage="Next"
                    />
                  </EuiButton>
                ) : (
                  <EuiButton
                    onClick={handleResolve}
                    fill
                    disabled={selectedSecondaries.size === 0}
                    isLoading={linkMutation.isLoading}
                    data-test-subj="resolveEntitiesResolveButton"
                  >
                    <FormattedMessage
                      id="xpack.securitySolution.entityAnalytics.resolution.modal.resolve"
                      defaultMessage="Resolve"
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

// Entity Card Component
interface EntityCardProps {
  entity: FilterableEntity;
  isSelected: boolean;
  isCheckbox: boolean;
  onSelect: () => void;
  cardStyles: ReturnType<typeof css>;
  selectedStyles: ReturnType<typeof css>;
}

const EntityCard: React.FC<EntityCardProps> = ({
  entity,
  isSelected,
  isCheckbox,
  onSelect,
  cardStyles,
  selectedStyles,
}) => {
  const checkboxId = useGeneratedHtmlId({ prefix: 'entityCard' });

  return (
    <EuiPanel
      css={[cardStyles, isSelected && selectedStyles]}
      onClick={onSelect}
      data-test-subj={`entityCard-${entity.id}`}
      paddingSize="none"
      hasShadow={false}
    >
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        {isCheckbox && (
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              id={checkboxId}
              checked={isSelected}
              onChange={onSelect}
              aria-label={entity.name}
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="user" size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">
                <strong>{entity.name}</strong>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            {entity.risk_score != null && (
              <EuiFlexItem grow={false}>
                <EuiBadge color={getRiskColor(entity.risk_score)}>
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.resolution.modal.riskScore"
                    defaultMessage="Risk: {score}"
                    values={{ score: Math.round(entity.risk_score) }}
                  />
                </EuiBadge>
              </EuiFlexItem>
            )}
            {entity.resolved_count > 0 && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.resolution.modal.resolvedCount"
                    defaultMessage="{count} resolved"
                    values={{ count: entity.resolved_count }}
                  />
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

// Helper to get risk color based on score
const getRiskColor = (score: number): string => {
  if (score >= 70) return 'danger';
  if (score >= 50) return 'warning';
  if (score >= 20) return 'default';
  return 'success';
};
