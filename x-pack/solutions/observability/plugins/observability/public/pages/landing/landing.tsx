/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { OVERVIEW_PATH } from '../../../common/locators/paths';

export function LandingPage() {
  const history = useHistory();

  useEffect(() => {
    history.replace(OVERVIEW_PATH);
  }, [history]);

  return <></>;
}
