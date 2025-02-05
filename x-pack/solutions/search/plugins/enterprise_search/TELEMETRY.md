# Telemetry

We have three forms of Telemetry in Kibana Enterprise Search:

1. Automatic URL navigation tracking
2. Automatic click tracking
3. Manual telemetry tracking

Automatic URL navigation tracking happens automatically and doesn't require any work from our side.

Click tracking also happens automatically, but works by sending the DOM tree location of the clicked element. That's only useful if that element has a good click tracking id. To facilitate this, we add a `data-telemetry-id` attribute to each button and other relevant elements. The telemetry is formatted like so:

`{app}-{ingestion type if applicable}-{page title}-{page subtitle}-{element title}`
`entSearchContent-connector-overview-generateApiKey-optimizedRequest`

You don't need to stick to this format exactly and you can deviate with the three titles if they don't make sense.

We also have a [telemetry endpoint](server/routes/enterprise_search/telemetry.ts) that can be used to create custom tracking counters, which are saved to Kibana's saved objects and periodically sent to the telemetry cluster. We can use this endpoint to facilitate more specific, customized telemetry needs.

Keep in mind that tracking and telemetry can be privacy and security sensitive, and we want to make sure we only send generic data to the telemetry cluster. For example, we should not be tracking the contents of form fields or index names.
