/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButtonIcon,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLoadingSpinner,
  EuiSplitPanel,
  EuiText,
} from '@elastic/eui';
import { debounce } from 'lodash';
import { i18n } from '@kbn/i18n';
import { ResultFieldProps } from './result_types';
import { ResultFields } from './results_fields';

export interface EditableResultProps {
  leftSideItem?: React.ReactNode;
  hasIndexSelector?: boolean;
  onDeleteDocument: () => void;
  onIndexSelectorChange?: (index: string) => void;
  onIdSelectorChange?: (id: string) => void;
  onExpand?: () => void;
  fields?: ResultFieldProps[];
  indices?: string[];
  initialDocId?: string;
  initialIndex?: string;
  error?: string;
  isLoading?: boolean;
}

export const EditableResult: React.FC<EditableResultProps> = ({
  leftSideItem,
  hasIndexSelector,
  onIndexSelectorChange,
  onIdSelectorChange,
  onDeleteDocument,
  onExpand,
  indices = [],
  fields = [],
  initialDocId = '',
  initialIndex = '',
  error,
  isLoading = false,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [documentId, setDocumentId] = React.useState(initialDocId);
  const [index, setIndex] = React.useState(initialIndex);
  return (
    <EuiSplitPanel.Outer hasBorder={true}>
      <EuiSplitPanel.Inner paddingSize="s" color="plain">
        <EuiFlexGroup gutterSize="s" alignItems="center">
          {leftSideItem && <EuiFlexItem grow={false}>{leftSideItem}</EuiFlexItem>}
          <EuiFlexItem>
            <EuiFlexGroup>
              <EuiFlexItem grow={5}>
                <EuiFieldText
                  data-test-subj="editableResultDocumentId"
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  onBlur={(e) => {
                    if (onIdSelectorChange) {
                      onIdSelectorChange(e.target.value);
                    }
                  }}
                  fullWidth
                  placeholder={i18n.translate(
                    'searchIndexDocuments.editableResult.documentIdPlaceholder',
                    {
                      defaultMessage: 'Document ID',
                    }
                  )}
                />
              </EuiFlexItem>
              {hasIndexSelector && (
                <EuiFlexItem grow={5}>
                  <EuiComboBox
                    data-test-subj="editableResultIndexSelector"
                    placeholder={i18n.translate(
                      'searchIndexDocuments.editableResult.selectIndexPlaceholder',
                      {
                        defaultMessage: 'Select index',
                      }
                    )}
                    singleSelection={{ asPlainText: true }}
                    options={indices.map((i) => ({ label: i, value: 'index' }))}
                    isClearable={false}
                    selectedOptions={index ? [{ label: index, value: 'index' }] : []}
                    onChange={(selected) => {
                      const selectedIndex = selected[0]?.label || '';
                      setIndex(selectedIndex);
                      if (onIndexSelectorChange) {
                        debounce(() => {
                          onIndexSelectorChange(selectedIndex);
                        }, 300)();
                      }
                    }}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              justifyContent="flexEnd"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                {error && <EuiIcon type="warning" color="danger" />}
                {!error &&
                  hasIndexSelector &&
                  (isLoading ? (
                    <EuiLoadingSpinner />
                  ) : (
                    <EuiButtonIcon
                      size="xs"
                      iconType={isExpanded ? 'fold' : 'unfold'}
                      color="primary"
                      aria-label={isExpanded ? 'Collapse fields' : 'Expand fields'}
                      onClick={() => {
                        if (onExpand && !isExpanded) {
                          onExpand();
                        }
                        setIsExpanded(!isExpanded);
                      }}
                    />
                  ))}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="trash"
                  color="danger"
                  onClick={onDeleteDocument}
                  aria-label="Delete document"
                  data-test-subj="editableResultDeleteButton"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      {!error && fields?.length > 0 && isExpanded && (
        <>
          <EuiHorizontalRule margin="none" />
          <EuiSplitPanel.Inner paddingSize="s" color="plain">
            <ResultFields documentId="12345" isExpanded={false} fields={fields} />
          </EuiSplitPanel.Inner>
        </>
      )}
      {error && (
        <EuiSplitPanel.Inner paddingSize="s" color="danger">
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiText color="danger" size="xs">
                <EuiIcon type="warning" />
                &nbsp;
                {error}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>
      )}
    </EuiSplitPanel.Outer>
  );
};
