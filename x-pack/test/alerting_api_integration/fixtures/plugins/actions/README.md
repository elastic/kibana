functional test server slack simulator
================================================================================

The code in this directory will run a Slack HTTP simulator; it will return
different responses based on the content of the text message sent to the
endpoint.

This will be used during functional testing runner tests for actions; an
action will be created pointing to the simulator, and then messages posted
to test handling different error conditions.


what a Slack server returns
--------------------------------------------------------------------------------

Here's some examples of `curl`'ing a Slack webhook to see the different
responses it will return:

```console
$ curl -v $SLACK_WEBHOOK_URL -d '{"text":"Hello, World!"}'
< HTTP/2 200
< content-type: text/html
ok

$ curl -v $SLACK_WEBHOOK_URL -d '{"txt":"Hello, World!"}'
< HTTP/2 400
< content-type: text/html
no_text

$ curl -v $SLACK_WEBHOOK_URL -d '[]'
< HTTP/2 400
< content-type: text/html
invalid_payload


$ curl -v $SLACK_WEBHOOK_URL_LESS_ONE_CHAR -d '{"text":"Hello, World!"}'
< HTTP/2 403
< content-type: text/html
invalid_token

$ curl -v $SLACK_WEBHOOK_URL -d '{"text":"rate limited yet?"}'
< HTTP/2 429
< content-type: application/json; charset=utf-8
< retry-after: 1
{"retry_after":1,"ok":false,"error":"rate_limited"}
```

abuse a server
--------------------------------------------------------------------------------

To get a rate limiting response, run this in one terminal window, and while
that is running, run a normal curl command to post a message.  You may need to
try a few times.

You should probably do this with a personal slack instance, not a company one :-)

```console
$ autocannon --amount 10000 --method POST --body '{"text":"Hello, World!"}' $SLACK_WEBHOOK_URL
```

simulator usage
--------------------------------------------------------------------------------

These may get out of date, consult the code for exact urls and inputs:

```console
$ export SLACK_URL=http://localhost:5620/api/_actions-FTS-external-service-simulators/slack

$ curl -v $SLACK_URL -H 'content-type: application/json' -d '{"text":"slack-success"}'
< HTTP/1.1 200 OK
< content-type: text/html; charset=utf-8
ok
```