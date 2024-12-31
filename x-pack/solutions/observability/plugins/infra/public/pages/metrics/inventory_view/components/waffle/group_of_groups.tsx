/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from '@emotion/styled';
import { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import {
  InfraWaffleMapBounds,
  InfraWaffleMapGroupOfGroups,
  InfraWaffleMapOptions,
} from '../../../../../common/inventory/types';
import { GroupName } from './group_name';
import { GroupOfNodes } from './group_of_nodes';

interface Props {
  onDrilldown: (filter: string) => void;
  options: InfraWaffleMapOptions;
  group: InfraWaffleMapGroupOfGroups;
  formatter: (val: number) => string;
  bounds: InfraWaffleMapBounds;
  nodeType: InventoryItemType;
  currentTime: number;
  detailsItemId: string | null;
}

export const GroupOfGroups: React.FC<Props> = (props) => {
  return (
    <GroupOfGroupsContainer>
      <GroupName group={props.group} onDrilldown={props.onDrilldown} options={props.options} />
      <Groups>
        {props.group.groups.map((group) => (
          <GroupOfNodes
            isChild={true}
            key={group.id}
            onDrilldown={props.onDrilldown}
            options={props.options}
            group={group}
            formatter={props.formatter}
            bounds={props.bounds}
            nodeType={props.nodeType}
            currentTime={props.currentTime}
            detailsItemId={props.detailsItemId}
          />
        ))}
      </Groups>
    </GroupOfGroupsContainer>
  );
};

const GroupOfGroupsContainer = styled.div`
  margin: 0 10px;
  width: 100%;
`;

const Groups = styled.div`
  display: flex;
  background-color: rgba(0, 0, 0, 0.05);
  flex-wrap: wrap;
  justify-content: center;
  padding: 20px 10px 10px;
  border-radius: 4px;
  border: 1px solid ${(props) => props.theme.euiTheme.border.color};
  box-shadow: 0 1px 7px rgba(0, 0, 0, 0.1);
`;
