/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * @file x-pack/solutions/observability/plugins/observability/public/pages/overview/index.tsx
 *
 * Claude Design demo — replaces the Observability Overview page with a
 * Tic Tac Toe game generated via the Claude Design → Kibana pipeline.
 *
 * To revert: restore the previous OverviewPage implementation and remove
 * the tic_tac_toe component directory.
 */

export { TicTacToe as OverviewPage } from '../../components/tic_tac_toe';
