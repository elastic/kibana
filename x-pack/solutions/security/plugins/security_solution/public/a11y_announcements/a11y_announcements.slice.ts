/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { State } from '../common/store';

export interface AnnouncementState {
  screenReaderMessage: string;
}

// Initial state for announcements
const initialAnnouncementState: AnnouncementState = {
  screenReaderMessage: '',
};

const announcementSlice = createSlice({
  name: 'announcement',
  initialState: initialAnnouncementState,
  reducers: {
    /**
     * Sets the message that will be announced to screen readers
     */
    setScreenReaderMessage: (state, action: PayloadAction<string>) => {
      state.screenReaderMessage = action.payload;
    },
  },
});

export const { setScreenReaderMessage } = announcementSlice.actions;
export const announcementReducer = announcementSlice.reducer;

export const selectAnnouncement = (state: State): AnnouncementState => state.announcement;
