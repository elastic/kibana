/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiDescriptionList,
  EuiFieldText,
  EuiFilePicker,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { KbnInfoCallout } from '@kbn/ui-callout';
import * as i18n from './translations';

export const DETONATE_SUBMIT_MODAL_TEST_ID = 'detonateSubmitModal';

export interface DetonateSample {
  /** File name from the alert, when known. */
  fileName: string;
  /** SHA-256 from the alert, when known. */
  sha256: string;
  /** Host the alert fired on, when known. */
  hostName: string;
  /** Whether the file already has a detonation report. */
  isDetonated?: boolean;
}

type SampleSource = 'upload' | 'url';

const SOURCE_OPTIONS = [
  { id: 'upload', label: i18n.SOURCE_UPLOAD },
  { id: 'url', label: i18n.SOURCE_URL },
];

export interface DetonateSubmitModalProps {
  /**
   * Sample details read from the alert, used to prefill the form. When omitted, the modal is
   * standalone and lets the user upload a file or enter a URL instead.
   */
  sample?: DetonateSample;
  onClose: () => void;
  /** Called when the form is submitted. */
  onSubmit: () => void;
  /** Called when the user wants to see the existing analysis of the file. */
  onSeeAnalysis?: () => void;
}

/**
 * Modal to submit a sample for detonation. Prototype: nothing is sent anywhere, submitting just
 * calls `onSubmit`.
 */
export const DetonateSubmitModal = memo(
  ({ sample, onClose, onSubmit, onSeeAnalysis }: DetonateSubmitModalProps) => {
    const modalTitleId = useGeneratedHtmlId({ prefix: 'detonateSubmitModalTitle' });
    const [attachToCase, setAttachToCase] = useState(true);
    const [source, setSource] = useState<SampleSource>('upload');
    const [url, setUrl] = useState('');
    const [hasFile, setHasFile] = useState(false);

    const isValid = useMemo(() => {
      if (sample) return true;
      return source === 'url' ? url.trim().length > 0 : hasFile;
    }, [sample, source, url, hasFile]);

    const handleSubmit = useCallback(
      (event: React.FormEvent) => {
        event.preventDefault();
        if (isValid) {
          onSubmit();
        }
      },
      [isValid, onSubmit]
    );

    return (
      <EuiModal
        onClose={onClose}
        aria-labelledby={modalTitleId}
        maxWidth={560}
        data-test-subj={DETONATE_SUBMIT_MODAL_TEST_ID}
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle id={modalTitleId}>{i18n.MODAL_TITLE}</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiText size="s" color="subdued">
            {i18n.MODAL_DESCRIPTION}
          </EuiText>
          <EuiSpacer size="m" />
          <EuiForm component="form" id="detonateSubmitForm" onSubmit={handleSubmit}>
            {sample ? (
              <EuiPanel hasBorder hasShadow={false} paddingSize="m">
                <EuiDescriptionList
                  type="column"
                  compressed
                  columnWidths={[1, 2]}
                  listItems={[
                    { title: i18n.FILE_NAME, description: sample.fileName },
                    {
                      title: i18n.SHA_256,
                      description: (
                        <EuiText size="s" css={{ wordBreak: 'break-all' }}>
                          {sample.sha256}
                        </EuiText>
                      ),
                    },
                    { title: i18n.HOST, description: sample.hostName },
                  ]}
                />

                {sample.isDetonated && (
                  <>
                    <EuiSpacer size="m" />
                    <KbnInfoCallout
                      size="s"
                      title={i18n.ALREADY_DETONATED_TITLE}
                      text={<p>{i18n.ALREADY_DETONATED_TEXT}</p>}
                      actionProps={{
                        primary: {
                          children: i18n.SEE_ANALYSIS,
                          onClick: onSeeAnalysis ?? onClose,
                          'data-test-subj': 'detonateSeeAnalysis',
                        },
                      }}
                      data-test-subj="detonateAlreadyDetonatedCallout"
                    />
                  </>
                )}
              </EuiPanel>
            ) : (
              <>
                <EuiFormRow label={i18n.SAMPLE_SOURCE} fullWidth>
                  <EuiButtonGroup
                    legend={i18n.SAMPLE_SOURCE}
                    options={SOURCE_OPTIONS}
                    idSelected={source}
                    onChange={(id) => setSource(id as SampleSource)}
                    buttonSize="compressed"
                    isFullWidth
                    data-test-subj="detonateSampleSource"
                  />
                </EuiFormRow>
                <EuiSpacer size="m" />
                {source === 'upload' ? (
                  <EuiFormRow fullWidth>
                    <EuiFilePicker
                      fullWidth
                      initialPromptText={i18n.UPLOAD_PROMPT}
                      onChange={(files) => setHasFile(Boolean(files && files.length > 0))}
                      data-test-subj="detonateFilePicker"
                    />
                  </EuiFormRow>
                ) : (
                  <EuiFormRow label={i18n.URL_LABEL} fullWidth>
                    <EuiFieldText
                      fullWidth
                      placeholder={i18n.URL_PLACEHOLDER}
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      data-test-subj="detonateSampleUrl"
                    />
                  </EuiFormRow>
                )}
              </>
            )}
            <EuiSpacer size="m" />
            <EuiSwitch
              label={i18n.ATTACH_TO_CASE}
              checked={attachToCase}
              onChange={(e) => setAttachToCase(e.target.checked)}
              data-test-subj="detonateAttachToCase"
            />
          </EuiForm>
          <EuiSpacer size="m" />
          <EuiText size="xs" color="subdued">
            {i18n.SUBMIT_DISCLAIMER}
          </EuiText>
        </EuiModalBody>
        <EuiModalFooter>
          <EuiButtonEmpty onClick={onClose} data-test-subj="detonateCancel">
            {i18n.CANCEL}
          </EuiButtonEmpty>
          <EuiButton
            type="submit"
            form="detonateSubmitForm"
            fill
            isDisabled={!isValid}
            data-test-subj="detonateSubmit"
          >
            {i18n.DETONATE}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    );
  }
);

DetonateSubmitModal.displayName = 'DetonateSubmitModal';
