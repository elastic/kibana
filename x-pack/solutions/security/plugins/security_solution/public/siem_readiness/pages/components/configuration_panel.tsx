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

const MAX_COLUMNS_PER_ROW = 3;

// Helper function to convert category array to selection map
const getMapFromCategories = (selected: CategoryOption[]): CategorySelectionMap => {
  const map: CategorySelectionMap = {} as CategorySelectionMap;
  CATEGORY_OPTIONS.forEach((category) => {
    map[category] = selected.includes(category);
  });
  return map;
};

// Category labels for i18n
const CATEGORY_LABELS: Record<CategoryOption, string> = {
  Endpoint: i18n.translate(
    'xpack.securitySolution.siemReadiness.coverage.configuration.endpointLabel',
    { defaultMessage: 'Endpoint' }
  ),
  Identity: i18n.translate(
    'xpack.securitySolution.siemReadiness.coverage.configuration.identityLabel',
    { defaultMessage: 'Identity' }
  ),
  Network: i18n.translate(
    'xpack.securitySolution.siemReadiness.coverage.configuration.networkLabel',
    { defaultMessage: 'Network' }
  ),
  Cloud: i18n.translate('xpack.securitySolution.siemReadiness.coverage.configuration.cloudLabel', {
    defaultMessage: 'Cloud',
  }),
  'Application/SaaS': i18n.translate(
    'xpack.securitySolution.siemReadiness.coverage.configuration.applicationSaaSLabel',
    { defaultMessage: 'Application/SaaS' }
  ),
};

// Split categories into rows for layout
const CATEGORY_ROWS: CategoryOption[][] = [
  ['Endpoint', 'Identity', 'Network'],
  ['Cloud', 'Application/SaaS'],
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
  const [idToSelectedMap, setIdToSelectedMap] = useState<CategorySelectionMap>(() =>
    getMapFromCategories(selectedCategories)
  );

  // Reset checkbox state when selectedCategories prop changes or modal opens
  useEffect(() => {
    setIdToSelectedMap(getMapFromCategories(selectedCategories));
  }, [selectedCategories, isVisible]);

  // Handle checkbox changes using functional update to avoid stale closure
  const handleCheckboxChange = useCallback((optionId: CategoryOption) => {
    setIdToSelectedMap((prev) => ({
      ...prev,
      [optionId]: !prev[optionId],
    }));
  }, []);

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
            {CATEGORY_ROWS.map((row, rowIndex) => (
              <EuiFlexItem key={rowIndex}>
                <EuiFlexGroup gutterSize="m" alignItems="center">
                  {row.map((category) => (
                    <EuiFlexItem key={category} grow={false} style={{ minWidth: '150px' }}>
                      <EuiCheckbox
                        id={category}
                        label={CATEGORY_LABELS[category]}
                        checked={idToSelectedMap[category] || false}
                        onChange={() => handleCheckboxChange(category)}
                      />
                    </EuiFlexItem>
                  ))}
                  {row.length < MAX_COLUMNS_PER_ROW && <EuiFlexItem grow={false} />}
                </EuiFlexGroup>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <div style={{ height: '120px' }} />
          {selectedCount === 0 && (
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
        <EuiButton
          onClick={handleApply}
          fill
          data-test-subj="configurationModalSaveButton"
          disabled={selectedCount === 0}
        >
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
