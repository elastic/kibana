# Examples of using custom events in the plugin

The previous examples demonstrate how to use the TelemetryService in different scenarios in a React application.
These examples showcase how you can easily track custom events as users interact with your application. You can use these examples as a starting point and adapt them to your specific use case.

Any new example is more than welcome and should be added here in case we see more use cases.

## Trigger an event when the component mounts

**Use case example**: We want to track when a user preview alerts details and opens a flyout.

**Implementation**: when the flyout component mounts and is viewed, triggers the event.

```ts
function AlertsFlyout() {
  const {
    services: { telemetry },
  } = useKibanaContextForPlugin();

  useEffect(() => {
    telemetry.reportAlertDetailViewed();
  }, []);

  return <div>Alert details</div>;
}
```

## Trigger an event when the component unmounts:

**Use case example**: We want to track when a user closes an alert details flyout.

**Implementation**: when the flyout component unmounts and is viewed, triggers the event.

```ts
function AlertsFlyout() {
  const {
    services: { telemetry },
  } = useKibanaContextForPlugin();

  useEffect(() => {
    return () => {
      telemetry.reportAlertDetailClosed();
    };
  }, []);

  return <div>Alert details</div>;
}
```

## Trigger an event when the user interacts/clicks with something

**Use case example**: We want to track hosts' related details when a user clicks on a table entry.

**Implementation**: update the `handleClick` handler for the table entry to track the event adding properties related to the clicked host.

```ts
function HostsView() {
  const {
    services: { telemetry },
  } = useKibanaContextForPlugin();

  const handleHostClick = ({hostname, cloudProvider}) => {
    telemetry.reportHostsEntryClicked({
      hostname, 
      cloud_provider: cloudProvider
    })

    // Do something more
  }

  return (
    <HostList>
      <HostEntry onClick={() => handleHostClick({hostname: 'host-0', cloudProvider: 'aws'})}/>
      <HostEntry onClick={() => handleHostClick({hostname: 'host-1', cloudProvider: 'aws'})}/>
      <HostEntry onClick={() => handleHostClick({hostname: 'host-2', cloudProvider: 'aws'})}/>
    </HostList>
  )  
}
```

## Trigger an event as a side effect

**Use case example**: We want to track how many logs entry a user sees on each update in real-time mode.

**Implementation**: Each time new logs are shown, track the event as a side effect.

```ts
function LogsUI() {
  const {
    services: { telemetry },
  } = useKibanaContextForPlugin();

  useEffect(() => {
    telemetry.reportLogsAddedCount({ count: logsData.length });
  }, [logsData]);

  return <LogStream logs={logsData} />;
}
```