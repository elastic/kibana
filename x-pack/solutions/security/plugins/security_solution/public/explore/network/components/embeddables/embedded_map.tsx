/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// embedded map v2

import { EuiAccordion, EuiLink, EuiText, useEuiTheme } from '@elastic/eui';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import type { Filter, Query } from '@kbn/es-query';
import { isEqual } from 'lodash/fp';
import type { MapApi, RenderTooltipContentParams } from '@kbn/maps-plugin/public';
import type { LayerDescriptor } from '@kbn/maps-plugin/common';
import { buildTimeRangeFilter } from '../../../../detections/components/alerts_table/helpers';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useIsFieldInIndexPattern } from '../../../containers/fields';
import type { GlobalTimeArgs } from '../../../../common/containers/use_global_time';
import { Embeddable } from './embeddable';
import { IndexPatternsMissingPrompt } from './index_patterns_missing_prompt';
import { MapToolTip } from './map_tool_tip/map_tool_tip';
import * as i18n from './translations';
import { useKibana } from '../../../../common/lib/kibana';
import { getLayerList } from './map_config';
import { sourcererSelectors } from '../../../../sourcerer/store';
import type { State } from '../../../../common/store';
import type { SourcererDataView } from '../../../../sourcerer/store/model';
import { SourcererScopeName } from '../../../../sourcerer/store/model';

export const NETWORK_MAP_VISIBLE = 'network_map_visbile';

interface EmbeddableMapProps {
  maintainRatio?: boolean;
}

const EmbeddableMapRatioHolder = styled.div<EmbeddableMapProps>`
  .mapToolbarOverlay__button {
    display: none;
  }
  ${({ maintainRatio, theme: { euiTheme } }) =>
    maintainRatio &&
    css`
      padding-top: calc(3 / 4 * 100%); /* 4:3 (standard) ratio */
      position: relative;

      @media only screen and (min-width: ${euiTheme.breakpoint.m}) {
        padding-top: calc(9 / 32 * 100%); /* 32:9 (ultra widescreen) ratio */
      }
      @media only screen and (min-width: 1441px) and (min-height: 901px) {
        padding-top: calc(9 / 21 * 100%); /* 21:9 (ultrawide) ratio */
      }

      .embPanel {
        bottom: 0;
        left: 0;
        position: absolute;
        right: 0;
        top: 0;
      }
    `}
`;

const StyledEuiText = styled(EuiText)`
  margin-right: 16px;
`;

const StyledEuiAccordion = styled(EuiAccordion)`
  & .euiAccordion__triggerWrapper {
    padding: 16px;
  }
`;

EmbeddableMapRatioHolder.displayName = 'EmbeddableMapRatioHolder';

const EmbeddableMapWrapper = styled.div`
  position: relative;
`;

const EmbeddableMap = styled.div`
  height: 100%;
  width: 100%;
  position: absolute;
  top: 0;
`;

export interface EmbeddedMapProps {
  query: Query;
  filters: Filter[];
  startDate: string;
  endDate: string;
  setQuery: GlobalTimeArgs['setQuery'];
}

export const EmbeddedMapComponent = ({
  endDate,
  filters,
  query,
  setQuery,
  startDate,
}: EmbeddedMapProps) => {
  const { euiTheme } = useEuiTheme();
  const { services } = useKibana();
  const { storage } = services;

  const [isError, setIsError] = useState(false);
  const [isIndexError, setIsIndexError] = useState(false);
  const [storageValue, setStorageValue] = useState(storage.get(NETWORK_MAP_VISIBLE) ?? true);

  const { addError } = useAppToasts();

  const kibanaDataViews = useSelector(sourcererSelectors.kibanaDataViews);
  const selectedPatterns = useSelector((state: State) => {
    return sourcererSelectors.sourcererScopeSelectedPatterns(state, SourcererScopeName.default);
  });

  const isFieldInIndexPattern = useIsFieldInIndexPattern();

  const [layerList, setLayerList] = useState<LayerDescriptor[]>([]);
  const [availableDataViews, setAvailableDataViews] = useState<SourcererDataView[]>([]);

  useEffect(() => {
    let canceled = false;

    const fetchData = async () => {
      try {
        const apiResponse = await Promise.all(
          availableDataViews.map(async ({ title }) => isFieldInIndexPattern(title))
        );
        // ensures only index patterns with maps fields are passed
        const goodDataViews = availableDataViews.filter((_, i) => apiResponse[i] ?? false);
        if (!canceled) {
          setLayerList(getLayerList({ euiTheme }, goodDataViews));
        }
      } catch (e) {
        if (!canceled) {
          setLayerList([]);
          addError(e, { title: i18n.ERROR_CREATING_EMBEDDABLE });
          setIsError(true);
        }
      }
    };
    if (availableDataViews.length) {
      fetchData();
    }
    return () => {
      canceled = true;
    };
  }, [addError, availableDataViews, euiTheme, isFieldInIndexPattern]);

  useEffect(() => {
    const dataViews = kibanaDataViews.filter((dataView) =>
      selectedPatterns.includes(dataView.title)
    );
    if (selectedPatterns.length > 0 && dataViews.length === 0) {
      setIsIndexError(true);
    }
    setAvailableDataViews((prevViews) => (isEqual(prevViews, dataViews) ? prevViews : dataViews));
  }, [kibanaDataViews, selectedPatterns]);

  // This portalNode provided by react-reverse-portal allows us re-parent the MapToolTip within our
  // own component tree instead of the embeddables (default). This is necessary to have access to
  // the Redux store, theme provider, etc, which is required to register and un-register the draggable
  // Search InPortal/OutPortal for implementation touch points
  const portalNode = React.useMemo(() => createHtmlPortalNode(), []);

  const appliedFilters = useMemo(() => {
    return [...filters, ...buildTimeRangeFilter(startDate, endDate)];
  }, [filters, startDate, endDate]);

  const setDefaultMapVisibility = useCallback(
    (isOpen: boolean) => {
      storage.set(NETWORK_MAP_VISIBLE, isOpen);
      setStorageValue(isOpen);
    },
    [storage]
  );

  const content = !storageValue ? null : (
    <Embeddable>
      <InPortal node={portalNode}>
        <MapToolTip />
      </InPortal>
      <EmbeddableMapWrapper>
        <EmbeddableMapRatioHolder className="siemEmbeddable__map" maintainRatio={!isIndexError} />
        {isIndexError ? (
          <IndexPatternsMissingPrompt data-test-subj="missing-prompt" />
        ) : (
          <EmbeddableMap>
            <services.maps.Map
              // eslint-disable-next-line react/display-name
              getTooltipRenderer={() => (tooltipProps: RenderTooltipContentParams) =>
                <OutPortal node={portalNode} {...tooltipProps} />}
              mapCenter={{ lon: -1.05469, lat: 15.96133, zoom: 1 }}
              layerList={layerList}
              filters={appliedFilters}
              query={query}
              onApiAvailable={(api: MapApi) => {
                // Wire up to app refresh action
                setQuery({
                  id: 'embeddedMap', // Scope to page type if using map elsewhere
                  inspect: null,
                  loading: false,
                  refetch: () => api.reload(),
                });
              }}
            />
          </EmbeddableMap>
        )}
      </EmbeddableMapWrapper>
    </Embeddable>
  );

  return isError ? null : (
    <StyledEuiAccordion
      data-test-subj="EmbeddedMapComponent"
      onToggle={setDefaultMapVisibility}
      id={'network-map'}
      arrowDisplay="right"
      arrowProps={{
        color: 'primary',
        'data-test-subj': `${storageValue}-toggle-network-map`,
      }}
      buttonContent={<strong>{i18n.EMBEDDABLE_HEADER_TITLE}</strong>}
      extraAction={
        <StyledEuiText size="xs">
          <EuiLink href={`${services.docLinks.links.siem.networkMap}`} target="_blank">
            {i18n.EMBEDDABLE_HEADER_HELP}
          </EuiLink>
        </StyledEuiText>
      }
      paddingSize="none"
      initialIsOpen={storageValue}
    >
      {content}
    </StyledEuiAccordion>
  );
};

EmbeddedMapComponent.displayName = 'EmbeddedMapComponent';

export const EmbeddedMap = React.memo(EmbeddedMapComponent);

EmbeddedMap.displayName = 'EmbeddedMap';
