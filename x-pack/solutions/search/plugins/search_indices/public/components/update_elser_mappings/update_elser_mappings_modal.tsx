/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiSpacer,
  EuiButtonEmpty,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiSelectable,
  EuiText,
  EuiLink,
  EuiBadge,
  EuiToken,
  type EuiSelectableOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isElserOnMlNodeSemanticField, prepareFieldsForEisUpdate, deNormalize } from './utils';
import type { MappingsOptionData, NormalizedFields } from './types';
import { useKibana } from '../../hooks/use_kibana';
import { useUpdateMappings } from '../../hooks/api/use_update_mappings';
import { docLinks } from '../../../common/doc_links';

export interface UpdateElserMappingsModalProps {
  indexName: string;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  hasUpdatePrivileges: boolean | undefined;
  mappings: NormalizedFields['byId'];
}

export function UpdateElserMappingsModal({
  indexName,
  setIsModalOpen,
  hasUpdatePrivileges,
  mappings,
}: UpdateElserMappingsModalProps) {
  const { notifications } = useKibana().services;
  const { updateIndexMappings, isLoading } = useUpdateMappings();

  const [options, setOptions] = useState<EuiSelectableOption<MappingsOptionData>[]>([]);
  const isApplyDisabled = hasUpdatePrivileges === false || options.every((o) => o.checked !== 'on');

  const buildElserOptions = useCallback(
    (flattenedMappings: NormalizedFields['byId']): EuiSelectableOption<MappingsOptionData>[] => {
      const elserMappings = Object.values(flattenedMappings).filter(isElserOnMlNodeSemanticField);

      return elserMappings.map((field) => ({
        label: field.path.join('.'),
        name: field.source.name,
        key: field.id,
        prepend: <EuiToken iconType="tokenSemanticText" />,
        append: <EuiBadge color="hollow">{field.source.inference_id as string}</EuiBadge>,
      }));
    },
    []
  );

  const renderMappingOption = useCallback((option: EuiSelectableOption<MappingsOptionData>) => {
    return (
      <>
        <EuiText size="s">{option.name}</EuiText>
        <EuiText size="xs" color="subdued" className="eui-displayBlock">
          <small>{option.label || ''}</small>
        </EuiText>
      </>
    );
  }, []);

  const handleApply = useCallback(async () => {
    const selectedOptions = options.filter((option) => option.checked === 'on');
    const selectedFields = prepareFieldsForEisUpdate(selectedOptions, mappings);
    const denormalizedFields = deNormalize(selectedFields);

    updateIndexMappings(
      {
        indexName,
        fields: denormalizedFields,
      },
      {
        onSuccess: () => {
          notifications.toasts.addSuccess({
            title: i18n.translate(
              'xpack.searchIndices.updateElserMappingsModal.successfullyUpdatedIndexMappingsTitle',
              { defaultMessage: 'Mappings updated' }
            ),
            text: i18n.translate(
              'xpack.searchIndices.updateElserMappingsModal.successfullyUpdatedIndexMappingsText',
              { defaultMessage: 'Your index mappings have been updated.' }
            ),
          });
          setIsModalOpen(false);
        },
        onError: (error) => {
          const fallbackErrorMessage = i18n.translate(
            'xpack.searchIndices.updateElserMappingsModal.error.defaultMessage',
            {
              defaultMessage: 'Mappings could not be updated. Please try again.',
            }
          );
          const errorMessage = error?.body?.message ?? error?.message ?? fallbackErrorMessage;
          notifications.toasts.addError(new Error(errorMessage), {
            title: i18n.translate('xpack.searchIndices.updateElserMappingsModal.error.title', {
              defaultMessage: 'Error updating mappings',
            }),
          });
        },
      }
    );
  }, [indexName, options, notifications.toasts, setIsModalOpen, updateIndexMappings, mappings]);

  useEffect(() => {
    const elserOptions = buildElserOptions(mappings);
    setOptions(elserOptions);
  }, [mappings, buildElserOptions]);

  return (
    <EuiModal
      style={{ width: 600 }}
      aria-labelledby={i18n.translate(
        'xpack.searchIndices.updateElserMappingsModal.ariaLabelledBy',
        {
          defaultMessage: 'Update mappings to ELSER on EIS modal',
        }
      )}
      onClose={() => setIsModalOpen(false)}
      data-test-subj="updateElserMappingsModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle size="s">
          {i18n.translate('xpack.searchIndices.updateElserMappingsModal.title', {
            defaultMessage: 'Update mappings to ELSER on EIS',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText>
          {i18n.translate('xpack.searchIndices.updateElserMappingsModal.costsTransparency', {
            defaultMessage:
              'Performing inference and other ML tasks using the Elastic Inference Service (EIS) will incur token-based costs.',
          })}
        </EuiText>
        <EuiSpacer size="s" />
        <EuiLink
          data-test-subj="updateElserMappingsModalLearnMoreLink"
          data-telemetry-id="indexDetailsData-updateElserMappingsModal-learnMore-link"
          href={docLinks.elasticInferenceServicePricing}
          target="_blank"
          external
        >
          {i18n.translate('xpack.searchIndices.updateElserMappingsModal.learnMoreLink', {
            defaultMessage: 'Learn more',
          })}
        </EuiLink>
        <EuiSpacer size="l" />
        <EuiSelectable<MappingsOptionData>
          data-test-subj="updateElserMappingsSelect"
          aria-label={i18n.translate('xpack.searchIndices.updateElserMappingsModal.select', {
            defaultMessage: 'Select ELSER mappings',
          })}
          options={options}
          listProps={{ bordered: true, isVirtualized: true, rowHeight: 50 }}
          onChange={(newOptions) => setOptions(newOptions)}
          renderOption={renderMappingOption}
        >
          {(list) => list}
        </EuiSelectable>
        <EuiSpacer size="l" />
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.searchIndices.updateElserMappingsModal.updateConditions', {
            defaultMessage:
              'Only fields using .elser-2-elasticsearch can be updated to use .elser-2-elastic on the Elastic Inference Service.',
          })}
        </EuiText>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup alignItems="center" justifyContent="flexEnd">
          <EuiButtonEmpty
            data-test-subj="UpdateElserMappingsModalCancelBtn"
            data-telemetry-id="indexDetailsData-updateElserMappingsModal-cancel-btn"
            onClick={() => setIsModalOpen(false)}
            aria-label={i18n.translate(
              'xpack.searchIndices.updateElserMappingsModal.cancelButtonAriaLabel',
              {
                defaultMessage: 'Cancel and close modal',
              }
            )}
          >
            {i18n.translate('xpack.searchIndices.updateElserMappingsModal.cancelButtonLabel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
          <EuiButton
            fill
            onClick={handleApply}
            isLoading={isLoading}
            data-test-subj="UpdateElserMappingsModalApplyBtn"
            data-telemetry-id="indexDetailsData-updateElserMappingsModal-apply-btn"
            isDisabled={isApplyDisabled}
          >
            {i18n.translate('xpack.searchIndices.updateElserMappingsModal.applyButton', {
              defaultMessage: 'Apply',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
}
