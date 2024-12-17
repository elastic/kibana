/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/css';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import type { GlobalWidgetParameters } from '@kbn/investigate-plugin/public';
import React, { useMemo, useRef } from 'react';
import { Options } from '../register_items';

export const EMBEDDABLE_ITEM_TYPE = 'embeddable';

const embeddableClassName = css`
  height: 100%;
  > [data-shared-item] {
    height: 100%;
  }
`;

type Props = EmbeddableItemParams & GlobalWidgetParameters;

type ParentApi = ReturnType<React.ComponentProps<typeof ReactEmbeddableRenderer>['getParentApi']>;

function ReactEmbeddable({ type, config, timeRange: { from, to }, savedObjectId }: Props) {
  const configWithOverrides = useMemo(() => {
    return {
      ...config,
      timeRange: {
        from,
        to,
      },
      savedObjectId,
    };
  }, [config, from, to, savedObjectId]);

  const configWithOverridesRef = useRef(configWithOverrides);

  configWithOverridesRef.current = configWithOverrides;

  const api = useMemo<ParentApi>(() => {
    return {
      getSerializedStateForChild: () => ({ rawState: configWithOverridesRef.current }),
    };
  }, []);

  return (
    <div className={embeddableClassName}>
      <ReactEmbeddableRenderer
        type={type}
        getParentApi={() => api}
        maybeId={savedObjectId}
        hidePanelChrome
      />
    </div>
  );
}

interface EmbeddableItemParams {
  type: string;
  config: Record<string, any>;
  savedObjectId?: string;
}

export function registerEmbeddableItem({
  dependencies: {
    setup: { investigate },
  },
  services,
}: Options) {
  investigate.registerItemDefinition<EmbeddableItemParams, {}>({
    type: EMBEDDABLE_ITEM_TYPE,
    generate: async (option: {
      itemParams: EmbeddableItemParams;
      globalParams: GlobalWidgetParameters;
    }) => {
      return {};
    },
    render: (option: {
      itemParams: EmbeddableItemParams;
      globalParams: GlobalWidgetParameters;
    }) => {
      const parameters = {
        type: option.itemParams.type,
        config: option.itemParams.config,
        savedObjectId: option.itemParams.savedObjectId,
        timeRange: option.globalParams.timeRange,
      };

      return (
        <EuiFlexItem
          grow={true}
          className={css`
            > div {
              height: 128px;
            }
          `}
        >
          <ReactEmbeddable {...parameters} />
        </EuiFlexItem>
      );
    },
  });
}
