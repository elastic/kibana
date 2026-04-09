/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { WatchlistObject } from '../../../common/api/entity_analytics/watchlists/management/common.gen';

export interface AiCreatedWatchlist extends WatchlistObject {
  entityNames?: string[];
  generatedEsql?: string;
}

export class AiWatchlistService {
  private readonly watchlistSubject = new BehaviorSubject<AiCreatedWatchlist | null>(null);

  public readonly aiCreatedWatchlist$ = this.watchlistSubject.asObservable();

  public setAiCreatedWatchlist = (watchlist: AiCreatedWatchlist): void => {
    this.watchlistSubject.next(watchlist);
  };

  public clearAiCreatedWatchlist = (): void => {
    this.watchlistSubject.next(null);
  };

  public reset = (): void => {
    this.watchlistSubject.next(null);
  };
}
