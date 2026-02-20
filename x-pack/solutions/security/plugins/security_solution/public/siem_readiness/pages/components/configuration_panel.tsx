/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
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
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { MainCategories } from '@kbn/siem-readiness';
import { ALL_CATEGORIES } from '@kbn/siem-readiness';

export const ACTIVE_CATEGORIES_STORAGE_KEY = 'siem_readiness_configurations:active_categories';

export interface SiemReadinessTabActiveCategoriesProps {
  activeCategories: MainCategories[];
}

// Category labels for i18n
const CATEGORY_LABELS: Record<MainCategories, string> = {
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

interface CategoryConfigurationPanelProps {
  onClose: () => void;
  /** Notifies parent to re-render since useLocalStorage doesn't sync across components in the same tab */
  onSave?: (categories: MainCategories[]) => void;
}

export const CategoryConfigurationPanel: React.FC<CategoryConfigurationPanelProps> = ({
  onClose,
  onSave,
}) => {
  const { euiTheme } = useEuiTheme();

  // Read/write to localStorage
  const [activeCategories, setActiveCategories] = useLocalStorage<MainCategories[]>(
    ACTIVE_CATEGORIES_STORAGE_KEY,
    ALL_CATEGORIES
  );

  // Draft state for pending changes (before Save)
  const [draftCategories, setDraftCategories] = useState<MainCategories[]>(
    activeCategories ?? ALL_CATEGORIES
  );

  const toggleCategory = (category: MainCategories) => {
    setDraftCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleApply = () => {
    setActiveCategories(draftCategories);
    onSave?.(draftCategories);
    onClose();
  };

  const hasNoSelection = draftCategories.length === 0;

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
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: euiTheme.size.m,
            }}
          >
            {ALL_CATEGORIES.map((category) => (
              <EuiCheckbox
                key={category}
                id={category}
                label={CATEGORY_LABELS[category]}
                checked={draftCategories.includes(category)}
                onChange={() => toggleCategory(category)}
              />
            ))}
          </div>
          <div style={{ height: '120px' }} />
          {hasNoSelection && (
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
          disabled={hasNoSelection}
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
