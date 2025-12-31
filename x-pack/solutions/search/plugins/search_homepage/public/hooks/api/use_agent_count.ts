/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useKibana } from '../use_kibana';

export const useAgentCount = () => {
  const {
    services: { agentBuilder },
  } = useKibana();
  const [toolCount, setToolCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  useEffect(() => {
    agentBuilder?.tools
      .list()
      .then((tools) => {
        setToolCount(tools.length);
      })
      .catch(() => {
        setIsError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [agentBuilder]);

  return { tools: toolCount, agents: 0, isLoading, isError };
};
