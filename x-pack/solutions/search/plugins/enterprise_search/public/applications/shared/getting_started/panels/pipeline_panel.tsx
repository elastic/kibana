/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { PipelinePanel } from '@kbn/search-api-panels';

import clusterImage from '../../../../assets/images/cluster.svg';
import cutImage from '../../../../assets/images/cut.svg';
import reporterImage from '../../../../assets/images/reporter.svg';

export const GettingStartedPipelinePanel: React.FC = () => {
  return (
    <PipelinePanel clusterImage={clusterImage} cutImage={cutImage} reporterImage={reporterImage} />
  );
};
