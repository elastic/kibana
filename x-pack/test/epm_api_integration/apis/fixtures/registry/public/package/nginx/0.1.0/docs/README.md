# Nginx Integration

This integration periodically fetches metrics from [https://nginx.org/](Nginx) servers. It can parse access and error
logs created by the HTTP server. 

## Compatibility

The Nginx `stubstatus` metrics was tested with Nginx 1.9 and are expected to work with all version >= 1.9.
The logs were tested with version 1.10.
On Windows, the module was tested with Nginx installed from the Chocolatey repository.

## Logs

**Timezone support**

This datasource parses logs that don’t contain timezone information. For these logs, the Elastic Agent reads the local
timezone and uses it when parsing to convert the timestamp to UTC. The timezone to be used for parsing is included
in the event in the `event.timezone` field.

To disable this conversion, the event.timezone field can be removed with the drop_fields processor.

If logs are originated from systems or applications with a different timezone to the local one, the `event.timezone`
field can be overwritten with the original timezone using the add_fields processor.

### Access Logs

Access logs collects the nginx access logs.

**Exported fields**

| Field | Description | Type |
|---|---|---|
| http.request.method | HTTP request method. The field value must be normalized to lowercase for querying. See the documentation section "Implementing ECS". | keyword |
| http.request.referrer | Referrer for this HTTP request. | keyword |
| http.response.body.bytes | Size in bytes of the response body. | long |
| http.response.status_code | HTTP response status code. | long |
| http.version | HTTP version. | keyword |
| nginx.access.remote_ip_list | An array of remote IP addresses. It is a list because it is common to include, besides the client IP address, IP addresses from headers like `X-Forwarded-For`. Real source IP is restored to `source.ip`. | array |
| source.geo.city_name | City name. | keyword |
| source.geo.continent_name | Name of the continent. | keyword |
| source.geo.country_iso_code | Country ISO code. | keyword |
| source.geo.location | Longitude and latitude. | geo_point |
| source.geo.region_iso_code | Region ISO code. | keyword |
| source.geo.region_name | Region name. | keyword |
| url.original | Unmodified original url as seen in the event source. Note that in network monitoring, the observed URL may be a full URL, whereas in access logs, the URL is often just represented as a path. This field is meant to represent the URL as it was observed, complete or not. | keyword |
| user.name | Short name or login of the user. | keyword |
| user_agent.device.name | Name of the device. | keyword |
| user_agent.name | Name of the user agent. | keyword |
| user_agent.original | Unparsed user_agent string. | keyword |
| user_agent.os.name | Operating system name, without the version. | keyword |


### Error Logs

Error logs collects the nginx error logs.

**Exported fields**

| Field | Description | Type |
|---|---|---|
| log.level | Original log level of the log event. If the source of the event provides a log level or textual severity, this is the one that goes in `log.level`. If your source doesn't specify one, you may put your event transport's severity here (e.g. Syslog severity). Some examples are `warn`, `err`, `i`, `informational`. | keyword |
| message | For log events the message field contains the log message, optimized for viewing in a log viewer. For structured logs without an original message field, other fields can be concatenated to form a human-readable summary of the event. If multiple messages exist, they can be combined into one message. | text |
| nginx.error.connection_id | Connection identifier. | long |
| process.pid | Process id. | long |
| process.thread.id | Thread ID. | long |


### Ingress Controller Logs

Error logs collects the ingress controller logs.

**Exported fields**

| Field | Description | Type |
|---|---|---|
| http.request.method | HTTP request method. The field value must be normalized to lowercase for querying. See the documentation section "Implementing ECS". | keyword |
| http.request.referrer | Referrer for this HTTP request. | keyword |
| http.response.body.bytes | Size in bytes of the response body. | long |
| http.response.status_code | HTTP response status code. | long |
| http.version | HTTP version. | keyword |
| nginx.ingress_controller.http.request.id | The randomly generated ID of the request | text |
| nginx.ingress_controller.http.request.length | The request length (including request line, header, and request body) | long |
| nginx.ingress_controller.http.request.time | Time elapsed since the first bytes were read from the client | double |
| nginx.ingress_controller.remote_ip_list | An array of remote IP addresses. It is a list because it is common to include, besides the client IP address, IP addresses from headers like `X-Forwarded-For`. Real source IP is restored to `source.ip`. | array |
| nginx.ingress_controller.upstream.alternative_name | The name of the alternative upstream. | text |
| nginx.ingress_controller.upstream.ip | The IP address of the upstream server. If several servers were contacted during request processing, their addresses are separated by commas. | ip |
| nginx.ingress_controller.upstream.name | The name of the upstream. | text |
| nginx.ingress_controller.upstream.port | The port of the upstream server. | long |
| nginx.ingress_controller.upstream.response.length | The length of the response obtained from the upstream server | long |
| nginx.ingress_controller.upstream.response.status_code | The status code of the response obtained from the upstream server | long |
| nginx.ingress_controller.upstream.response.time | The time spent on receiving the response from the upstream server as seconds with millisecond resolution | double |
| source.geo.city_name | City name. | keyword |
| source.geo.continent_name | Name of the continent. | keyword |
| source.geo.country_iso_code | Country ISO code. | keyword |
| source.geo.location | Longitude and latitude. | geo_point |
| source.geo.region_iso_code | Region ISO code. | keyword |
| source.geo.region_name | Region name. | keyword |
| url.original | Unmodified original url as seen in the event source. Note that in network monitoring, the observed URL may be a full URL, whereas in access logs, the URL is often just represented as a path. This field is meant to represent the URL as it was observed, complete or not. | keyword |
| user.name | Short name or login of the user. | keyword |
| user_agent.device.name | Name of the device. | keyword |
| user_agent.name | Name of the user agent. | keyword |
| user_agent.original | Unparsed user_agent string. | keyword |
| user_agent.os.name | Operating system name, without the version. | keyword |


## Metrics

### Stub Status Metrics

The Nginx stubstatus stream collects data from the Nginx `ngx_http_stub_status` module. It scrapes the server status
data from the web page generated by ngx_http_stub_status.

This is a default stream. If the host datasource is unconfigured, this stream is enabled by default.

An example event for nginx looks as following:

```$json
{
   "@timestamp":"2020-04-28T11:07:58.223Z",
   "service":{
      "type":"nginx",
      "address":"127.0.0.1:8081"
   },
   "nginx":{
      "stubstatus":{
         "waiting":0,
         "hostname":"127.0.0.1:8081",
         "dropped":0,
         "writing":1,
         "handled":7339,
         "requests":7411,
         "reading":0,
         "accepts":7339,
         "current":10,
         "active":1
      }
   },
   "stream":{
      "namespace":"default",
      "type":"metrics",
      "dataset":"nginx.stubstatus"
   },
   "ecs":{
      "version":"1.5.0"
   },
   "agent":{
      "type":"metricbeat",
      "ephemeral_id":"8eb07b4f-df58-4794-8e00-60f1443f33b6",
      "hostname":"MacBook-Elastic.local",
      "id":"e47f6e4d-5277-46f3-801d-221c7584c604",
      "version":"8.0.0"
   },
   "event":{
      "module":"nginx",
      "duration":1112095,
      "dataset":"nginx.stubstatus"
   },
   "metricset":{
      "period":10000,
      "name":"stubstatus"
   }
}
```

**Exported fields**

| Field | Description | Type |
|---|---|---|
| nginx.stubstatus.accepts | The total number of accepted client connections. | long |
| nginx.stubstatus.active | The current number of active client connections including Waiting connections. | long |
| nginx.stubstatus.current | The current number of client requests. | long |
| nginx.stubstatus.dropped | The total number of dropped client connections. | long |
| nginx.stubstatus.handled | The total number of handled client connections. | long |
| nginx.stubstatus.hostname | Nginx hostname. | keyword |
| nginx.stubstatus.reading | The current number of connections where Nginx is reading the request header. | long |
| nginx.stubstatus.requests | The total number of client requests. | long |
| nginx.stubstatus.waiting | The current number of idle client connections waiting for a request. | long |
| nginx.stubstatus.writing | The current number of connections where Nginx is writing the response back to the client. | long |

