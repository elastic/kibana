/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import SearchLakeSvg from '../../assets/search_lake.svg';
import VectorStoreEmbeddingsSvg from '../../assets/vector_store_embeddings.svg';
import { OnboardingPathPanel } from './onboarding_path_panel';
import { pathQuery } from '../../hooks/use_wizard_path';
import { useOnboardingNavigate } from '../../hooks/use_onboarding_navigate';
import type { VectorPath } from '../types';
import { ONBOARDING_PATH } from '../../routes';

export const OnboardingPaths = ({ origin }: { origin: string }) => {
  const navigate = useOnboardingNavigate(origin);
  const choose = (path: VectorPath) => navigate(`${ONBOARDING_PATH}/ingest${pathQuery(path)}`);

  return (
    <>
      <EuiTitle size="xs">
        <h2>
          {i18n.translate('vectordbOnboarding.pathSelection.sectionHeader', {
            defaultMessage: 'Follow these guides to add embeddings:',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem>
          <OnboardingPathPanel
            dataTestSubj="vectordbPathSelectionGenerate"
            telemetryId="vectordbOnboarding-pathSelection-generateVectors"
            icon={SearchLakeSvg}
            title={i18n.translate('vectordbOnboarding.pathSelection.generate.title', {
              defaultMessage: 'Generate embeddings from your content',
            })}
            description={
              <EuiText size="s" color="subdued">
                <p>
                  {i18n.translate('vectordbOnboarding.pathSelection.generate.description', {
                    defaultMessage:
                      'Ingest your content and let Elastic handle embeddings, storage, and search configuration.',
                  })}
                </p>
              </EuiText>
            }
            onClick={() => choose('generate-vectors')}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <OnboardingPathPanel
            dataTestSubj="vectordbPathSelectionStore"
            telemetryId="vectordbOnboarding-pathSelection-haveVectors"
            icon={VectorStoreEmbeddingsSvg}
            title={i18n.translate('vectordbOnboarding.pathSelection.store.title', {
              defaultMessage: 'Store your existing embeddings',
            })}
            description={
              <EuiText size="s" color="subdued">
                <p>
                  {i18n.translate('vectordbOnboarding.pathSelection.store.description', {
                    defaultMessage:
                      'Load your existing embeddings into optimized storage and start searching immediately.',
                  })}
                </p>
              </EuiText>
            }
            onClick={() => choose('have-vectors')}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
