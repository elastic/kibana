# Sourcerer Container

### `useInitSourcerer`

- called at the top of the app in HomePageComponent to initialize the sourcerer state!
- Calls `useSourcererDataView` (see below) for the active scope (ex:
  `PageScope.default | PageScope.alerts`)
- If there is an error with the data view, thrown here
- Run index field search for the active data view id, and when the active data view id updates
- we changed the logic to not fetch all the index fields for every data view on the loading of the app because user can
  have a lot of them and it can slow down the loading of the app and maybe blow up the memory of the browser.
- We decided to load the data view patternList and fields on demand, we know that will only have to load this data view
  on default and timeline scope. We will use two conditions to see if we need to fetch and initialize the data view
  selected. First, we will make sure that we did not already fetch them by using `searchedIds` and then we will init
  them if `selectedPatterns` is empty.
- onSignalIndexUpdated
    - called when signal index first has data in order to add it to the defaultDataView and refresh the index fields

### `useSourcererDataView`

- returns combined data from SourcererDataView and SourcererScope to create SelectedDataView state

```typescript
interface SelectedDataView {
  browserFields: SourcererDataView['browserFields'];
  dataViewId: string | null; // null if legacy pre-8.0 timeline
  /**
   * DataViewBase with enhanced index fields used in timelines
   */
  indexPattern: SecuritySolutionDataViewBase;
  /** do the selected indices exist  */
  indicesExist: boolean;
  /** is an update being made to the data view */
  loading: boolean;
  /** all active & inactive patterns from SourcererDataView['title']  */
  patternList: string[];
  runtimeMappings: SourcererDataView['runtimeMappings'];
  /** all selected patterns from SourcererScope['selectedPatterns'] */
  selectedPatterns: SourcererScope['selectedPatterns'];
  // active patterns when dataViewId == null
  activePatterns?: string[];
}
```

### Adding sourcerer to a new page

- In order for the sourcerer to show up on a page, it needs to be added to the array `sourcererPaths`
- The scope of a sourcerer component will be default unless the path is added to the `detectionsPaths` array, in which
  case the scope can be detections