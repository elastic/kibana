# @kbn/securitysolution-exception-list-components

Common exceptions' components

# Aim 

- To have most of the Exceptions' components in one place, to be shared accross multiple pages and used for different logic.
- This `package` holds the presetational part of the components only as the API or the logic part should reside under the consumer page

# Pattern used

```
component
    index.tsx
    index.styles.ts <-- to hold styles if the component has many custom styles
    use_component.ts <-- for logic if the Presentational Component has logic
    component.test.tsx
    use_component.test.tsx
  
```
# Testing 

In order to unify our testing tools, we configured only two libraries, the `React-Testing-Library` to test the component UI part and the `Reat-Testing-Hooks` to test the component's UI interactions

# Styling 

In order to follow the `KBN-Packages's` recommendations, to define a custom CSS we can only use the `@emotion/react` or `@emotion/css` libraries



# Next

- Now the `ExceptionItems, ExceptionItemCard
and ExceptionItemCardMetaInfo
  ` receive `securityLinkAnchorComponent, exceptionsUtilityComponent
, and exceptionsUtilityComponent
` as props to avoid moving all the `common` components under the `x-pack` at once, later we should move all building blocks to this `kbn-package`
