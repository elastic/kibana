---
status: accepted
date: 2024-04-05
---

# 0001 - Saving of timeline-associated saved objects

## Context and Problem Statement

As described in [#178182](https://github.com/elastic/kibana/issues/178182), the removal of autosave on timeline resulted in a regression in which pinned events and comments on unsaved timelines are lost.

When commenting on an unsaved timeline or an event in a timeline or when pinning an event in a timeline, the pins/comments are lost when the timeline has not been saved before. This used to work in 8.11 and is broken from version 8.12 onwards.

What's causing this bug is that the associated saved objects have a field `timelineId` that connects them to the timeline. When a (pin/note) save request comes in, the server checks for that field and if it doesn't exist, it will create a new timeline on the fly and return its `timelineId` and `timelineVersion` as part of the saved object's response.

https://github.com/elastic/kibana/blob/2df44b9f7f76f3d03f6e32be7f2a39034f97c22e/x-pack/plugins/security_solution/server/lib/timeline/saved_object/notes/saved_object.ts#L138-L148

These two fields are currently not used in the timeline middleware:

https://github.com/elastic/kibana/blob/2df44b9f7f76f3d03f6e32be7f2a39034f97c22e/x-pack/plugins/security_solution/public/timelines/store/middlewares/timeline_note.ts#L60

This gives the false impression that the associated saved object has been stored but it actually has been associated to a different timeline. Subsequent saves of the active timeline (which is not the associated timeline) will then create a new `timelineId`. When the page is reloaded, the associated saved objects will be gone from that timeline.

## Considered Options

- Auto-saving timeline as draft when an a note or pinned event is created
- Disabling notes and pinned events until the timeline is saved
- Opening the save modal when clicking the note/pin buttons on an unsaved timeline
- Caching notes and pinned events locally, saving when timeline is saved

## Decision Outcome

Chosen option: **Auto-saving timeline as draft when an a note or pinned event is created**

### Confirmation

https://github.com/elastic/kibana/pull/178212

## Discussion of options

### Auto-saving timeline as draft when an a note or pinned event is created

In this proposed solution we're bringing back parts of the "auto-save" behaviour. A request to save the associated saved object will precede request to create a draft timeline (given that timeline has not been saved previously). Draft timelines are ephemeral and tied to a specific user so "auto-saving" will not create version conflicts since they cannot be concurrently edited.
This approach has been implemented in https://github.com/elastic/kibana/pull/178212 .

| Pros                                         | Cons                                                            |
| -------------------------------------------- | --------------------------------------------------------------- |
| Mimics the previous auto-save behaviour      | Draft timelines are not surfaced anywhere in the UI (by design) |
| Easy to test in unit and in acceptance tests |                                                                 |
| Simple, very few things can go wrong         |                                                                 |
| No public API changes necessary              |                                                                 |

### Disabling notes and pinned events until the timeline is saved

Disabling all note/pin buttons and lists until the timeline is saved makes sure that no associated saved objects can be created with a missing `timelineId`. Subsequently, the code that creates timelines when `timelineId` is missing should be removed as well.
This approach has been implemented in https://github.com/elastic/kibana/pull/178525 .

| Pros                                         | Cons                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| Easy to test in unit and in acceptance tests | Requires public API changes                                               |
| Simple, very few things can go wrong         | Users might use note/pin less often, since they are disabled "by default" |
|                                              | Possibility to create orphaned notes when duplicating timelines or creating one from an alert that has an investigation guide |

### Opening the save modal when clicking the note/pin buttons on an unsaved timeline

Instead of disabling the note/pin buttons on an unsaved timeline, they are enabled by default but instead of performing the note/pin action right away, they're opening the timeline's save modal. The modal contains a callout, explaining that they need to save the timeline first in order to perform their original action. After saving the timeline, their original action is performed.
This approach has been proposed here: https://github.com/elastic/kibana/pull/178525#issuecomment-1992596905

| Pros                                         | Cons                                                      |
| -------------------------------------------- | --------------------------------------------------------- |
| Easy to test in unit and in acceptance tests | Users might be confused as to why the save modal opens up |
| Simple, very few things can go wrong         |                                                           |
| Requires no public API changes               |                                                           |

### Caching notes and pinned events locally, saving when timeline is saved

Notes and pinned events are stored locally, until the timeline is persisted. When the timeline is saved, the locally stored saved objects are either sent alongside the save request or they are saved on the client once the save request finishes.
This approach comes out of an internal Slack thread.

| Pros | Cons                                                                                                                                                                   
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|      | (potentially) requires public API changes                                                                                                                                        |
|      | We need to make sure, this local cache is emptied properly when switching timelines                                                                                              |
|      | Unclear what should happen if a save of an associated saved object fails, while the timeline has been created and the other objects could be created. There are no transactions. |
|      | Likely requires changes to the "Unsaved changes" modal                                                                                                                           |
