# AsyncResourceState

>Note: This documentation is far from complete, please update it as you see fit.

`AsyncResourceState` is a helper type that is used to keep track of resources that will be loaded via an API call and used to show data. It is an union of all these types:

* `LoadingResourceState`
* `LoadedResourceState`
* `FailedResourceState`
* `UninitialisedResourceState`
* `StaleResourceState` (not part of AsyncResourceState, see next)

`StaleResourceState` exists to represent all non-loading states. It is a union of `LoadedResourceState`, `FailedResourceState` and `UninitialisedResourceState` but does not include `LoadingResourceState`

## Use case

When you want to load a resource from an API you want to keep the status of said resource updated to render your view accordingly. `AsyncResourceState` works by wrapping the real `data` into the previously mentioned states and providing other helper functions to see if the data is available.

e.g.: Show a list of elements coming from `/api/items`:

*With helpers and builders*

```typescript
const ListComponent = () => {
  // the initial value of list is an UninitialisedResourceState. 
  const [list, setList] = useState(createUninitialisedResourceState())

  useEffect( () => {
    // set the list as loading, `createLoadingResourceState` can be used for this as well
    setList(createLoadingResourceState(asStaleResourceState(list))) // see NOTE 1

    try {
      const data = await fetch("/api/items");
      // sets the data as loaded
      setList(createLoadedResourceState(data));
    } catch(e) {
      //set the error
      setList(createFailedResourceState(e));
    }

  }, [])

  if (isFailedResourceState(list)) {
    return ( <RenderError error={list.error} />)
  }
  
  return ( isLoadingResourceState(list) ? <Loader /> : <TableView data={list.data} ) 
}
```

*without helpers and builders*

```typescript
const ListComponent = () => {
  // the initial value of list is an UninitialisedResourceState. You can also use the `createUninitialisedResourceState` helper for this
  const [list, setList] = useState({ type: 'UninitialisedResourceState'})

  useEffect( () => {
    // set the list as loading, `createLoadingResourceState` can be used for this as well
    setList({type: 'LoadingResourceState', previousState: list});

    try {
      const data = await fetch("/api/items");
      // sets the data as loaded
      setList({type: 'LoadedResourceState', data: await data.json() })
    } catch(e) {
      //set the error
      setList({type: 'FailedResourceState', error: e, lastLoadedState: list })
    }

  }, [])

  if (list.type === 'FailedResourceState') {
    return ( <RenderError error={list.error} />)
  }
  
  return ( list.type ==='LoadingResourceState' ? <Loader /> : <TableView data={list.data} ) 
}

```

> *NOTE 1*: `createLoadingResourceState` can only accept a StaleResourceState. In this example `list` could be a `LoadingResourceState` if this code executes twice for example. To prevent type errors an `asStaleResourceState` is used that make sure to convert the current object into an acceptable one.

## A redux use case

The previous example is not too realistic because using react hooks there are easier ways to know if a resource is available or not and there are libraries that could handle this state for us. 

A more suited case for `AsyncResourceState` is using redux and actions when you want to keep all your state in a single place but you need a dedicated type to keep your resource loading/loaded state. This requires more boilerplate code to setup and it looks like this:


*State type definition*
```typescript
interface MyListPageState = {
  entries: AsyncResourceState<MyItemType[]>
}
```

*Actions definition*
```typescript
export MyListPageEntriesChanged = {
  payload: MyListPageState['entries']
}
```

*Reducer definition*
```typescript
export reducer = (state, action) => {
  if (action.type === 'myListPageEntriesChanged'){
    return {
      ...state,
      entries: action.payload
    }
  }
}
```

*middleware definition (actual data load)*
```typescript
export const myListPageMiddleware = () => {
  return (store) => (next) => async (action) => {
    next(action);

    if (action.type === 'userChangedUrl' && isMyListPage(action.payload)) {
      // set the loading state
      dispatch({
        type: 'myListPageEntriesChanged',
        // IMPORTANT: note the usage of the `asStaleResourceState` helper. Otherwise this will
        // create types error because the current `entries` could be another LoadingResourceState
        payload: createLoadingResourceState(asStaleResourceState(store.getState().entries));
      })
      try {
        const data = await fetch("/api/items");

        // set data loaded
        dispatch({
          type: 'myListPageEntriesChanged',
          payload: createLoadedResourceState(data)
        })
      } catch(e) {
        dispatch({
          type: 'myListPageEntriesChanged',
          payload: createFailedResourceState(e)
        })
      }
  })
```

*react component code*
```typescript
const ListComponent = () => {
  const list = myListPageSelector( (state) => state.entries );

  if (isFailedResourceState(list)) {
    return ( <RenderError error={list.error} />)
  }
  
  return ( isLoadingResourceState(list) ? <Loader /> : <TableView data={list.data} ) 
}
```

## Types error with `LoadingResourceState` and `FailedResourceState`

You might encounter types problems with the `LoadingResourceState` and `FailedResourceState` because they only work with specific subtypes of the `AsyncResourceState`:

`LoadingResourceState` only accepts a `StaleResourceState`. If you try to assign a variable with type `AsyncResourceState` it will give you a type error because `AsyncResourceState` could also be a `LoadingResourceState`. Use the `asStaleResourceState` helper to convert an object into a correct StaleResourceState

```typescript
const entries = store.getState().entries;
dispatch({type: 'MyAction', payload: createLoadingResourceState(asStaleResourceState(entries)); //NOTE the asStaleResourceState
try {
  const data = await fetchData(...)
  dispatch({type: 'MyAction', payload: createLoadedResourceState(entries);
} catch(e) {
  dispatch({type: 'MyAction', payload: createFailedResourceState(e, isLoadedResourceState(entries) ? entries : undefined));
}

```

`FailedResourceState` only accepts a `LoadedResourceState` as `lastLoadedState`. You can use the `isLoadedResourceState` to decide if you need to pass it. e.g:


```typescript
const entries = store.getState().entries;
try {
  const data = await fetchData(...)
  dispatch({type: 'MyAction', payload: createLoadedResourceState(entries);
} catch(e) {
  dispatch({type: 'MyAction', payload: createFailedResourceState(e, isLoadedResourceState(entries) ? entries : undefined));
}
```

If you don't want to define a previous state for `FailedResourceState` you will need to pass the correct type to the `createFailedResourceState` to instruct Typescript the possible data contained inside
```typescript
  dispatch({type: 'MyAction', payload: createFailedResourceState<MyItemType[]>(e); // Note <MyItemType>
```

## The ImmutableObject problem

If you are using redux, all the data coming from selectors is wrapped around an `ImmutableObject` data type. The `AsyncResourceState` is prepared to deal with this scenario, provided you use the helpers and builders available.


