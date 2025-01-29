# Autocomplete Fields

Need an input that shows available index fields? Or an input that auto-completes based on a selected indexPattern field? Bingo! That's what these components are for. They are generalized enough so that they can be reused throughout and repurposed based on your needs.

All three of the available components rely on Eui's combo box.

## useFieldValueAutocomplete

This hook uses the kibana `services.data.autocomplete.getValueSuggestions()` service to return possible autocomplete fields based on the passed in `indexPattern` and `selectedField`.

## FieldComponent

This component can be used to display available indexPattern fields. It requires an indexPattern to be passed in and will show an error state if value is not one of the available indexPattern fields. Users will be able to select only one option.

The `onChange` handler is passed `DataViewFieldBase[]`.

```js
<FieldComponent
  placeholder={i18n.FIELD_PLACEHOLDER}
  indexPattern={indexPattern}
  selectedField={selectedField}
  isLoading={isLoading}
  isClearable={isClearable}
  onChange={handleFieldChange}
/>
```

## OperatorComponent

This component can be used to display available operators. If you want to pass in your own operators, you can use `operatorOptions` prop. If a `operatorOptions` is provided, those will be used and it will ignore any of the built in logic that determines which operators to show. The operators within `operatorOptions` will still need to be of type `OperatorOption`.

If no `operatorOptions` is provided, then the following behavior is observed:

- if `selectedField` type is `boolean`, only `is`, `is not`, `exists`, `does not exist` operators will show
- if `selectedField` type is `nested`, only `is` operator will show
- if not one of the above, all operators will show (see `operators.ts`)

The `onChange` handler is passed `OperatorOption[]`.

```js
<OperatorComponent
  placeholder={i18n.OPERATOR_PLACEHOLDER}
  selectedField={selectedField}
  operator={selectedOperator}
  isDisabled={iDisabled}
  isLoading={isLoading}
  isClearable={isClearable}
  onChange={handleOperatorChange}
/>
```

## AutocompleteFieldExistsComponent

This field value component is used when the selected operator is `exists` or `does not exist`. When these operators are selected, they are equivalent to using a wildcard. The combo box will be displayed as disabled.

```js
<AutocompleteFieldExistsComponent placeholder={i18n.EXISTS_VALUE_PLACEHOLDER} />
```

## AutocompleteFieldListsComponent

This component can be used to display available large value lists - when operator selected is `is in list` or `is not in list`. It relies on hooks from the `lists` plugin. Users can only select one list and an error is shown if value is not one of available lists.

The `selectedValue` should be the `id` of the selected list.

This component relies on `selectedField` to render available lists. The reason being that it relies on the `selectedField` type to determine which lists to show as each large value list has a type as well. So if a user selects a field of type `ip`, it will only display lists of type `ip`.

The `onChange` handler is passed `ListSchema`.

```js
<AutocompleteFieldListsComponent
  selectedField={selectedField}
  placeholder={i18n.FIELD_LISTS_PLACEHOLDER}
  selectedValue={id}
  isLoading={isLoading}
  isDisabled={iDisabled}
  isClearable={isClearable}
  onChange={handleFieldListValueChange}
/>
```

## AutocompleteFieldMatchComponent

This component can be used to allow users to select one single value. It uses the autocomplete hook to display any autocomplete options based on the passed in `indexPattern`, but also allows a user to add their own value.

It does some minor validation, assuring that field value is a date if `selectedField` type is `date`, a number if `selectedField` type is `number`, an ip if `selectedField` type is `ip`.

The `onChange` handler is passed selected `string`.

```js
<AutocompleteFieldMatchComponent
  placeholder={i18n.FIELD_VALUE_PLACEHOLDER}
  selectedField={selectedField}
  selectedValue={value}
  isDisabled={iDisabled}
  isLoading={isLoading}
  isClearable={isClearable}
  indexPattern={indexPattern}
  onChange={handleFieldMatchValueChange}
/>
```

## AutocompleteFieldMatchAnyComponent

This component can be used to allow users to select multiple values. It uses the autocomplete hook to display any autocomplete options based on the passed in `indexPattern`, but also allows a user to add their own values.

It does some minor validation, assuring that field values are a date if `selectedField` type is `date`, numbers if `selectedField` type is `number`, ips if `selectedField` type is `ip`.

The `onChange` handler is passed selected `string[]`.

```js
<AutocompleteFieldMatchAnyComponent
  placeholder={i18n.FIELD_VALUE_PLACEHOLDER}
  selectedField={selectedField}
  selectedValue={values}
  isDisabled={false}
  isLoading={isLoading}
  isClearable={false}
  indexPattern={indexPattern}
  onChange={handleFieldMatchAnyValueChange}
/>
```

## AutocompleteFieldWildcardComponent

This component can be used to allow users to select a single value. It uses the autocomplete hook to display any autocomplete options based on the passed in `indexPattern`, but also allows a user to add their own value.

The `onChange` handler is passed selected `string[]`.

```js
<AutocompleteFieldWildcardComponent
  placeholder={i18n.FIELD_VALUE_PLACEHOLDER}
  selectedField={selectedField}
  selectedValue={values}
  isDisabled={false}
  isLoading={isLoading}
  isClearable={false}
  indexPattern={indexPattern}
  onChange={handleFieldMatchAnyValueChange}
  warning='input warning'
/>
```