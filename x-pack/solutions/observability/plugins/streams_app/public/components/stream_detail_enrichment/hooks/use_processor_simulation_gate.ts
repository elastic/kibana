/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/observability-utils-browser/hooks/use_abort_controller';
import { ReadStreamDefinition, ProcessingDefinition } from '@kbn/streams-schema';
import { useKibana } from '../../../hooks/use_kibana';

export const useProcessorSimulationGate = ({
  definition,
}: {
  definition: ReadStreamDefinition;
}) => {
  const { core, dependencies } = useKibana();
  const { toasts } = core.notifications;
  const { streamsRepositoryClient } = dependencies.start.streams;

  const abortController = useAbortController();

  return async (processingDefinition: ProcessingDefinition) => {
    try {
      await streamsRepositoryClient.fetch('POST /api/streams/{id}/processing/_simulate', {
        signal: abortController.signal,
        params: {
          path: { id: definition.name },
          body: {
            documents: [{ _source: {} }],
            processing: [processingDefinition],
          },
        },
      });
    } catch (error) {
      toasts.addError(error, {
        title: i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.simulationErrorTitle',
          { defaultMessage: 'The processor configuration is not valid' }
        ),
        toastMessage: error.body.message,
      });
      throw error;
    }
  };
};
