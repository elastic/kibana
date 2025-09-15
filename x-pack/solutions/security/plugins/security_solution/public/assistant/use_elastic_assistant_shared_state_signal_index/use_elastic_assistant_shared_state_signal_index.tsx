/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useKibana } from '../../common/lib/kibana';
import { useSignalIndex } from '../../detections/containers/detection_engine/alerts/use_signal_index';

export const useElasticAssistantSharedStateSignalIndex = () => {
  const { elasticAssistantSharedState } = useKibana().services;
  const { signalIndexName } = useSignalIndex();

  useEffect(() => {
    if (!signalIndexName) {
      return elasticAssistantSharedState.signalIndex.setSignalIndex(undefined);
    }
    elasticAssistantSharedState.signalIndex.setSignalIndex(signalIndexName); // setSignalIndex returns a function to unset the signal index. We don't unset the signal index here so that the signal index is present when the assistant is invoked outside of the security solution.
  }, [signalIndexName, elasticAssistantSharedState]);
};
