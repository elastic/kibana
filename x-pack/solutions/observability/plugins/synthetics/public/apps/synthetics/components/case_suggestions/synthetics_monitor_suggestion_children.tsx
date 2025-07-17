/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { SuggestionDefinitionPublicProps } from '@kbn/observability-case-suggestion-registry-plugin/public';
import { SYNTHETICS_MONITORS_EMBEDDABLE } from '../../../embeddables/constants';

const SyntheticsMonitorSuggestionChildren: React.FC<SuggestionDefinitionPublicProps> = ({
  data,
  suggestionId,
}) => {
  const { attachments, metadata } = data;
  const payload = attachments[0].payload;
  return (
    <>
      <EuiText>
        A monitor matching service name <strong>checkout</strong> has 5 failing tests in the past 15
        minutes.
      </EuiText>
      <EmbeddableRenderer
        css={{ height: '100%' }}
        type={SYNTHETICS_MONITORS_EMBEDDABLE}
        getParentApi={() => ({
          getSerializedStateForChild: () => ({
            rawState: {
              filters: {
                monitorIds: [{ label: payload.id, value: payload.id }],
                locations: payload.locations.map((location) => ({
                  label: location.label,
                  value: location.id,
                })),
                tags: [],
                projects: [],
                monitorTypes: [],
              },
              view: 'cardView',
            },
          }),
        })}
        hidePanelChrome={true}
      />
    </>
  );
};

// Needed for the lazy loading of the component
// eslint-disable-next-line import/no-default-export
export default SyntheticsMonitorSuggestionChildren;
