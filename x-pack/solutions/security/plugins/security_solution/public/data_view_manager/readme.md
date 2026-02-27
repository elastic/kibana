# Data View Manager - **WIP**

The successor to the Sourcerer component used across Security Solution to select data views.

Design goals:

- Redux-only state management
- Async side effects handled by redux toolkit listener middleware, no useEffect for critical async logic
- Cached (both on the client and backend side (via data views service))
- Conforms to the platform standards (uses shared DataView infrastructure, types etc. only)
- Easy to understand
- Easy to use
- Handles missing saved data objects with Ad-Hoc Data Views
- Allows for data view management to the same extent Discover does it

## Architecture

### Multiple scopes

Each section of the app has its own `scope` that holds the selected data view, for that scope only. This is what makes having different data views selected for the timelines and alerts table at the same time.
It is possible however to select the same data view for multiple scopes at the same time, by specifying multiple scopes in `useSelectDataView` hook call. See [useSelectDataView]('./hooks/use_select_data_view.ts') for reference.

### Shared values

Shared values (eg. list of currently loaded kibana data views) are stored in a dedicated portion of the state, `shared`. Values in this space are intended for reuse.

### Async effects such as data view updates / creation / fetching

We are currently using redux toolkit listener middleware to implement side effects logic in Data View Picker for Security Solution plugin.

## Usage

Unless absolutely necessary, we recommend to stick to the provided hooks to obtain or select data views for desired scopes.
Please don't use actions manually to alter the data view manager state from outside the data view manager folder.
These restrictions exist so that we can guarantee the maximum performance.