/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useEffect } from 'react';
import {
  EuiPanel,
  EuiCheckbox,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiText,
  EuiCallOut,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

// Category options available for filtering
export type CategoryOption = 'Endpoint' | 'Identity' | 'Network' | 'Cloud' | 'Application/SaaS';

// Type for checkbox state mapping
type CategorySelectionMap = Record<CategoryOption, boolean>;

const CATEGORY_OPTIONS: CategoryOption[] = [
  'Endpoint',
  'Identity',
  'Network',
  'Cloud',
  'Application/SaaS',
];

interface CategoryConfigurationPanelProps {
  selectedCategories?: CategoryOption[];
  onSelectionChange?: (selectedCategories: CategoryOption[]) => void;
  isVisible: boolean;
  onClose: () => void;
}

export const CategoryConfigurationPanel: React.FC<CategoryConfigurationPanelProps> = ({
  selectedCategories = CATEGORY_OPTIONS, // Default to all categories selected
  onSelectionChange,
  isVisible,
  onClose,
}) => {
  // Convert array to checkbox group format
  const [idToSelectedMap, setIdToSelectedMap] = useState<CategorySelectionMap>(() => {
    const initialMap: CategorySelectionMap = {} as CategorySelectionMap;
    CATEGORY_OPTIONS.forEach((category) => {
      initialMap[category] = selectedCategories.includes(category);
    });
    return initialMap;
  });

  // Update checkbox state when selectedCategories prop changes
  useEffect(() => {
    const newMap: CategorySelectionMap = {} as CategorySelectionMap;
    CATEGORY_OPTIONS.forEach((category) => {
      newMap[category] = selectedCategories.includes(category);
    });
    setIdToSelectedMap(newMap);
  }, [selectedCategories]);

  // Handle checkbox changes with validation
  const handleCheckboxChange = useCallback(
    (optionId: CategoryOption) => {
      const currentlySelected = idToSelectedMap[optionId] || false;
      const wouldBeSelected = !currentlySelected;

      // If we're trying to uncheck and it would leave us with no selections, prevent it
      if (!wouldBeSelected) {
        const currentSelectedCount = Object.values(idToSelectedMap).filter(Boolean).length;
        if (currentSelectedCount <= 1) {
          return; // Don't allow unchecking the last item
        }
      }

      const newIdToSelectedMap = {
        ...idToSelectedMap,
        [optionId]: wouldBeSelected,
      };

      setIdToSelectedMap(newIdToSelectedMap);
    },
    [idToSelectedMap]
  );

  const handleApply = useCallback(() => {
    if (onSelectionChange) {
      const selectedCategoryArray = CATEGORY_OPTIONS.filter(
        (category) => idToSelectedMap[category]
      );
      onSelectionChange(selectedCategoryArray);
    }
    onClose();
  }, [idToSelectedMap, onSelectionChange, onClose]);

  const selectedCount = Object.values(idToSelectedMap).filter(Boolean).length;

  if (!isVisible) {
    return null;
  }

  return (
    <EuiModal
      onClose={onClose}
      initialFocus="[name=popswitch]"
      aria-labelledby="categoryFilterModalTitle"
      style={{ minWidth: '600px' }}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id="categoryFilterModalTitle">
          {i18n.translate(
            'xpack.securitySolution.siemReadiness.coverage.configuration.modalTitle',
            {
              defaultMessage: 'Configuration',
            }
          )}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiHorizontalRule margin="none" />
        <EuiSpacer size="m" />
        <EuiPanel paddingSize="none" hasShadow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem>
              <EuiText size="xs">
                <h3>
                  {i18n.translate(
                    'xpack.securitySolution.siemReadiness.coverage.configuration.title',
                    {
                      defaultMessage: 'Category applicability',
                    }
                  )}
                </h3>
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiText size="s" color="subdued">
                {i18n.translate(
                  'xpack.securitySolution.siemReadiness.coverage.configuration.titleDescription',
                  {
                    defaultMessage: 'Select which data source categories apply to your environment',
                  }
                )}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="m" />
          <EuiFlexGroup direction="column" gutterSize="m">
            {/* First row: Endpoint, Identity, Network */}
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="m" alignItems="center">
                <EuiFlexItem grow={false} style={{ minWidth: '150px' }}>
                  <EuiCheckbox
                    id="Endpoint"
                    label={i18n.translate(
                      'xpack.securitySolution.siemReadiness.coverage.configuration.endpointLabel',
                      {
                        defaultMessage: 'Endpoint',
                      }
                    )}
                    checked={idToSelectedMap.Endpoint || false}
                    onChange={() => handleCheckboxChange('Endpoint')}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false} style={{ minWidth: '150px' }}>
                  <EuiCheckbox
                    id="Identity"
                    label={i18n.translate(
                      'xpack.securitySolution.siemReadiness.coverage.configuration.identityLabel',
                      {
                        defaultMessage: 'Identity',
                      }
                    )}
                    checked={idToSelectedMap.Identity || false}
                    onChange={() => handleCheckboxChange('Identity')}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false} style={{ minWidth: '150px' }}>
                  <EuiCheckbox
                    id="Network"
                    label={i18n.translate(
                      'xpack.securitySolution.siemReadiness.coverage.configuration.networkLabel',
                      {
                        defaultMessage: 'Network',
                      }
                    )}
                    checked={idToSelectedMap.Network || false}
                    onChange={() => handleCheckboxChange('Network')}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>

            {/* Second row: Cloud, Application/SaaS */}
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="m" alignItems="center">
                <EuiFlexItem grow={false} style={{ minWidth: '150px' }}>
                  <EuiCheckbox
                    id="Cloud"
                    label={i18n.translate(
                      'xpack.securitySolution.siemReadiness.coverage.configuration.cloudLabel',
                      {
                        defaultMessage: 'Cloud',
                      }
                    )}
                    checked={idToSelectedMap.Cloud || false}
                    onChange={() => handleCheckboxChange('Cloud')}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false} style={{ minWidth: '150px' }}>
                  <EuiCheckbox
                    id="Application/SaaS"
                    label={i18n.translate(
                      'xpack.securitySolution.siemReadiness.coverage.configuration.applicationSaaSLabel',
                      {
                        defaultMessage: 'Application/SaaS',
                      }
                    )}
                    checked={idToSelectedMap['Application/SaaS'] || false}
                    onChange={() => handleCheckboxChange('Application/SaaS')}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false} />
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="xxl" />
          <EuiSpacer size="xxl" />
          <EuiSpacer size="xxl" />
          {selectedCount === 1 && (
            <>
              <EuiSpacer size="s" />
              <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                <EuiFlexItem>
                  <EuiCallOut
                    announceOnMount
                    title={i18n.translate(
                      'xpack.securitySolution.siemReadiness.coverage.configuration.noCategoriesSelectedTitle',
                      {
                        defaultMessage: 'No categories selected',
                      }
                    )}
                    color="danger"
                    iconType="warning"
                  >
                    <p>
                      {i18n.translate(
                        'xpack.securitySolution.siemReadiness.coverage.configuration.noCategoriesSelectedDescription',
                        {
                          defaultMessage: 'At least one category must be selected to save',
                        }
                      )}
                    </p>
                  </EuiCallOut>
                  <EuiSpacer size="s" />
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          )}
        </EuiPanel>
        <EuiHorizontalRule margin="none" />
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="configurationModalCancelButton">
          {i18n.translate(
            'xpack.securitySolution.siemReadiness.coverage.configuration.modalCancelButton',
            {
              defaultMessage: 'Cancel',
            }
          )}
        </EuiButtonEmpty>
        <EuiButton onClick={handleApply} fill data-test-subj="configurationModalSaveButton">
          {i18n.translate(
            'xpack.securitySolution.siemReadiness.coverage.configuration.modalSaveButton',
            {
              defaultMessage: 'Save',
            }
          )}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
