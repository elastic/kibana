/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SourceGenerationResult } from '../../hooks/use_source_generation';
import type { AnalyticsPageId } from './page_ids';
import { getPageTelemetryId, getPageTestSubj } from './page_ids';
import { generationStatusRow } from './shared_styles';
import type { StarterQueryUpgrade } from './use_starter_query_upgrade';

interface GenerationStatusProps {
  page: AnalyticsPageId;
  generation: SourceGenerationResult;
  upgrade: Pick<StarterQueryUpgrade, 'shown' | 'isOffered' | 'show' | 'regenerate'>;
}

const getProvenance = (model: string, schemaOnly: boolean): string =>
  schemaOnly
    ? i18n.translate('xpack.searchHomepage.analytics.generation.schemaOnlyProvenance', {
        defaultMessage:
          'Written by {model} from the field names and types of this source. Every query was run against your events first.',
        values: { model },
      })
    : i18n.translate('xpack.searchHomepage.analytics.generation.valuesProvenance', {
        defaultMessage:
          'Written by {model} from the field names of this source and a short summary of its values. Every query was run against your events first.',
        values: { model },
      });

/**
 * One quiet line under the questions: that generated ones are being written, are ready, or are the
 * ones on screen, with the single control that goes with it. Empty, but still a line, when
 * generation failed without having been asked for.
 */
export const GenerationStatus = ({
  page,
  generation: { status, isRegenerating, hasRegenerateFailed },
  upgrade: { shown, isOffered, show, regenerate },
}: GenerationStatusProps): React.JSX.Element => {
  const getMessage = (): React.ReactNode => {
    if (isOffered && !isRegenerating) {
      return i18n.translate('xpack.searchHomepage.analytics.generation.offered', {
        defaultMessage: 'Questions written for your data are ready.',
      });
    }
    if (shown !== undefined) {
      if (hasRegenerateFailed) {
        return i18n.translate('xpack.searchHomepage.analytics.generation.regenerateFailed', {
          defaultMessage: 'New questions could not be written. These are the earlier ones.',
        });
      }
      return (
        <>
          <EuiIcon type="sparkles" size="s" aria-hidden />{' '}
          {i18n.translate('xpack.searchHomepage.analytics.generation.shown', {
            defaultMessage: 'Generated for your data',
          })}{' '}
          <EuiIconTip
            type="info"
            size="s"
            color="subdued"
            content={getProvenance(shown.model, shown.schemaOnly)}
            aria-label={i18n.translate(
              'xpack.searchHomepage.analytics.generation.provenanceLabel',
              {
                defaultMessage: 'How these questions were written',
              }
            )}
            iconProps={{ 'data-test-subj': getPageTestSubj(page, 'GenerationProvenance') }}
          />
        </>
      );
    }
    if (status === 'pending') {
      return (
        <>
          <EuiLoadingSpinner size="s" />{' '}
          {i18n.translate('xpack.searchHomepage.analytics.generation.pending', {
            defaultMessage: 'Writing questions for your data…',
          })}
        </>
      );
    }
    return null;
  };

  const getAction = (): React.ReactNode => {
    if (isOffered && !isRegenerating) {
      return (
        <EuiButtonEmpty
          size="xs"
          flush="left"
          onClick={show}
          data-test-subj={getPageTestSubj(page, 'GenerationShow')}
          data-telemetry-id={getPageTelemetryId(page, 'generationShow')}
        >
          {i18n.translate('xpack.searchHomepage.analytics.generation.showButton', {
            defaultMessage: 'Show them',
          })}
        </EuiButtonEmpty>
      );
    }
    if (shown !== undefined) {
      return (
        <EuiButtonEmpty
          size="xs"
          flush="left"
          iconType="refresh"
          onClick={regenerate}
          isLoading={isRegenerating}
          data-test-subj={getPageTestSubj(page, 'GenerationRegenerate')}
          data-telemetry-id={getPageTelemetryId(page, 'generationRegenerate')}
        >
          {i18n.translate('xpack.searchHomepage.analytics.generation.regenerateButton', {
            defaultMessage: 'Regenerate',
          })}
        </EuiButtonEmpty>
      );
    }
    return null;
  };

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      wrap
      css={generationStatusRow}
      data-test-subj={getPageTestSubj(page, 'GenerationStatus')}
    >
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued" aria-live="polite">
          {getMessage()}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{getAction()}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
