/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from '@emotion/styled';
import { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { nodesToWaffleMap } from '../../lib/nodes_to_wafflemap';
import { isWaffleMapGroupWithGroups, isWaffleMapGroupWithNodes } from '../../lib/type_guards';
import { InfraWaffleMapBounds, InfraWaffleMapOptions } from '../../../../../common/inventory/types';
import { AutoSizer } from '../../../../../components/auto_sizer';
import { GroupOfGroups } from './group_of_groups';
import { GroupOfNodes } from './group_of_nodes';
import { applyWaffleMapLayout } from '../../lib/apply_wafflemap_layout';
import { SnapshotNode } from '../../../../../../common/http_api/snapshot_api';
import { sortNodes } from '../../lib/sort_nodes';

interface Props {
  nodes: SnapshotNode[];
  nodeType: InventoryItemType;
  options: InfraWaffleMapOptions;
  formatter: (subject: string | number) => string;
  currentTime: number;
  onFilter: (filter: string) => void;
  bounds: InfraWaffleMapBounds;
  bottomMargin: number;
  staticHeight: boolean;
  detailsItemId: string | null;
}

export const Map: React.FC<Props> = ({
  nodes,
  options,
  currentTime,
  onFilter,
  formatter,
  bounds,
  nodeType,
  bottomMargin,
  staticHeight,
  detailsItemId,
}) => {
  const sortedNodes = sortNodes(options.sort, nodes);
  const map = nodesToWaffleMap(sortedNodes);
  return (
    <AutoSizer bounds>
      {({ measureRef, bounds: { width = 0, height = 0 } }) => {
        const groupsWithLayout = applyWaffleMapLayout(map, width, height);
        return (
          <WaffleMapOuterContainer
            ref={(el: any) => measureRef(el)}
            bottomMargin={bottomMargin}
            data-test-subj="waffleMap"
            staticHeight={staticHeight}
          >
            <WaffleMapInnerContainer>
              {groupsWithLayout.map((group) => {
                if (isWaffleMapGroupWithGroups(group)) {
                  return (
                    <GroupOfGroups
                      onDrilldown={onFilter}
                      key={group.id}
                      options={options}
                      group={group}
                      formatter={formatter}
                      bounds={bounds}
                      nodeType={nodeType}
                      currentTime={currentTime}
                      detailsItemId={detailsItemId}
                    />
                  );
                }
                if (isWaffleMapGroupWithNodes(group)) {
                  return (
                    <GroupOfNodes
                      key={group.id}
                      options={options}
                      group={group}
                      onDrilldown={onFilter}
                      formatter={formatter}
                      isChild={false}
                      bounds={bounds}
                      nodeType={nodeType}
                      currentTime={currentTime}
                      detailsItemId={detailsItemId}
                    />
                  );
                }
              })}
            </WaffleMapInnerContainer>
          </WaffleMapOuterContainer>
        );
      }}
    </AutoSizer>
  );
};

const WaffleMapOuterContainer = styled.div<{ bottomMargin: number; staticHeight: boolean }>`
  flex: 1 0 0%;
  display: flex;
  justify-content: flex-start;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  margin-bottom: ${(props) => props.bottomMargin}px;
  max-width: calc(100vw - 90px);
  ${(props) => props.staticHeight && 'min-height: 300px;'}
`;

const WaffleMapInnerContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  align-content: flex-start;
`;
