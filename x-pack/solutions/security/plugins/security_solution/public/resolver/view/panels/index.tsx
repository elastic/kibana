/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useSelector } from 'react-redux';
import * as selectors from '../../store/selectors';
import { NodeEventsInCategory, type NodeEventOnClick } from './node_events_of_type';
import { NodeEvents } from './node_events';
import { NodeDetail } from './node_detail';
import { NodeList } from './node_list';
import { EventDetail } from './event_detail';
import type { PanelViewAndParameters } from '../../types';
import type { State } from '../../../common/store/types';

/**
 * Show the panel that matches the `panelViewAndParameters` (derived from the browser's location.search)
 */

// eslint-disable-next-line react/display-name
export const PanelRouter = memo(function ({
  id,
  nodeEventOnClick,
}: {
  id: string;
  nodeEventOnClick?: NodeEventOnClick;
}) {
  const params: PanelViewAndParameters = useSelector((state: State) =>
    selectors.panelViewAndParameters(state.analyzer[id])
  );
  if (params.panelView === 'nodeDetail') {
    return (
      <NodeDetail
        id={id}
        nodeID={params.panelParameters.nodeID}
        nodeEventOnClick={nodeEventOnClick}
      />
    );
  } else if (params.panelView === 'nodeEvents') {
    return <NodeEvents id={id} nodeID={params.panelParameters.nodeID} />;
  } else if (params.panelView === 'nodeEventsInCategory') {
    return (
      <NodeEventsInCategory
        id={id}
        nodeID={params.panelParameters.nodeID}
        eventCategory={params.panelParameters.eventCategory}
        nodeEventOnClick={nodeEventOnClick}
      />
    );
  } else if (params.panelView === 'eventDetail') {
    return (
      <EventDetail
        id={id}
        nodeID={params.panelParameters.nodeID}
        eventCategory={params.panelParameters.eventCategory}
      />
    );
  } else {
    /* The default 'Event List' / 'List of all processes' view */
    return <NodeList id={id} />;
  }
});
