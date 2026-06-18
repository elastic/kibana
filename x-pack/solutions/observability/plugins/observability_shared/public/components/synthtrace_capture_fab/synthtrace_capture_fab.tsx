/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiConfirmModal,
  EuiToolTip,
  useGeneratedHtmlId,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { IToasts } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';

export interface SynthtraceCaptureResult {
  /** Suggested download filename (`.ts` for a single scenario, `.zip` for a batched capture). */
  filename: string;
  /** Text content of a single scenario file. Present when the capture fit in one file. */
  scenario?: string;
  /** Base64-encoded zip of multiple scenario files. Present when the capture was split into batches. */
  zipBase64?: string;
}

/**
 * Decodes a base64 string into an `ArrayBuffer` for a binary (zip) download. Returning the buffer
 * (rather than a `Uint8Array`) keeps it a plain `ArrayBuffer`-backed `BlobPart`, sidestepping the
 * `Uint8Array<ArrayBufferLike>`/`SharedArrayBuffer` union that isn't assignable to `BlobPart`.
 */
const base64ToBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
};

export interface SynthtraceCaptureFabProps {
  /**
   * Whether the button should render. Callers combine the off-by-default advanced setting with
   * any page-specific preconditions (e.g. a resolved time range) before passing it in.
   */
  isVisible: boolean;
  /** Performs the capture request and resolves with the generated scenario + suggested filename. */
  onCapture: (signal: AbortSignal | null) => Promise<SynthtraceCaptureResult>;
  /** Toasts service used to surface success/failure to the user. */
  toasts: IToasts;
  /** `data-test-subj` for the button so each host app can target its own instance. */
  dataTestSubj: string;
  /** Optional button label override; defaults to "Capture page as synthtrace". */
  label?: string;
}

/**
 * Shared, domain-agnostic floating action button (bottom-right, fixed) for the
 * "Capture page as synthtrace scenario" developer tool. Owns the cross-cutting behaviour:
 * loading state, triggering the browser download, and success/error toasts. The host app
 * supplies the actual capture request (`onCapture`) and gating (`isVisible`).
 */
export function SynthtraceCaptureFab({
  isVisible,
  onCapture,
  toasts,
  dataTestSubj,
  label,
}: SynthtraceCaptureFabProps) {
  const { euiTheme } = useEuiTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const confirmModalTitleId = useGeneratedHtmlId();

  if (!isVisible) {
    return null;
  }

  const performCapture = async () => {
    setIsConfirmModalVisible(false);
    setIsLoading(true);
    try {
      const { scenario, zipBase64, filename } = await onCapture(null);

      const blob = zipBase64
        ? new Blob([base64ToBuffer(zipBase64)], { type: 'application/zip' })
        : new Blob([scenario ?? ''], { type: 'text/plain' });
      const fileURL = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = fileURL;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(fileURL);

      toasts.addSuccess(
        i18n.translate('xpack.observabilityShared.synthtraceCapture.successToast', {
          defaultMessage: 'Downloaded synthtrace scenario {filename}',
          values: { filename },
        })
      );
    } catch (error) {
      toasts.addDanger({
        title: i18n.translate('xpack.observabilityShared.synthtraceCapture.errorToast', {
          defaultMessage: 'Failed to capture synthtrace scenario',
        }),
        text: error.body?.message ?? error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const tooltipContent =
    label ??
    i18n.translate('xpack.observabilityShared.synthtraceCapture.fabLabel', {
      defaultMessage: 'Capture page as synthtrace',
    });

  return (
    <>
      <EuiToolTip
        content={tooltipContent}
        anchorProps={{
          css: css`
            position: fixed;
            bottom: ${euiTheme.size.l};
            right: ${euiTheme.size.l};
            z-index: ${euiTheme.levels.menu};
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          `,
        }}
      >
        <EuiButtonIcon
          data-test-subj={dataTestSubj}
          iconType="download"
          display="fill"
          color="accent"
          size="m"
          isLoading={isLoading}
          onClick={() => setIsConfirmModalVisible(true)}
          aria-label={tooltipContent}
        />
      </EuiToolTip>

      {isConfirmModalVisible && (
        <EuiConfirmModal
          aria-labelledby={confirmModalTitleId}
          titleProps={{ id: confirmModalTitleId }}
          title={i18n.translate('xpack.observabilityShared.synthtraceCapture.confirmModalTitle', {
            defaultMessage: 'This capture may contain sensitive data',
          })}
          data-test-subj={`${dataTestSubj}ConfirmModal`}
          onCancel={() => setIsConfirmModalVisible(false)}
          onConfirm={performCapture}
          cancelButtonText={i18n.translate(
            'xpack.observabilityShared.synthtraceCapture.confirmModalCancel',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.observabilityShared.synthtraceCapture.confirmModalConfirm',
            { defaultMessage: 'Download anyway' }
          )}
          buttonColor="warning"
        >
          <p>
            {i18n.translate('xpack.observabilityShared.synthtraceCapture.confirmModalBody', {
              defaultMessage:
                'The generated synthtrace scenario can include sensitive data captured from this page. Do not share it with untrusted people or organizations.',
            })}
          </p>
        </EuiConfirmModal>
      )}
    </>
  );
}
