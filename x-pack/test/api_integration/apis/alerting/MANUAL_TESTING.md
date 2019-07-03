# some notes on manually testing alerts and actions

## install `kbn-action`

Some CLI tools to issue Kibana alert and action HTTP requests are available
in this git repo: https://github.com/pmuellr/kbn-action

To install:

    npm install -g pmuellr/kbn-action

This will make the commands `kbn-action` and `kbn-alert` available in your
path.

## running Kibana with `yarn start --no-base-path`

The `kbn-action` and `kbn-alert` tools require a URL to the Kibana server,
and the normal way of running Kibana via `yarn start` adds a random base
path, to keep developers honest.  But means it's a pain to have to reconfigure
these tools every time you run `yarn start`.

Using the `--no-base-path` option will not add the base path, and the resulting
Kibana URL should be `http://localhost:5601`.

## configuring `kbn-action/alert` URL

To configure the tools to use this URL, you can set the following env var

    export KBN_URLBASE=http://elastic:changeme@localhost:5601

or use the `-u http://elastic:changeme@localhost:5601` option on the commands.


## creating an action to log a message on the server

```console
  $ kbn-action create .server-log "pmuellr server log" '{}'
  {
      "id": "95de8cfe-e658-4b15-9b02-2e8ab3d0465e"
  }

  $ kbn-action fire 95de8cfe-e658-4b15-9b02-2e8ab3d0465e '{message: hallo}'
  {
      "status": "ok"
  }
```

After running the above, you should see a message in the server log.

## creating an alert to run an action every second

```console
$ kbn-alert create .always-firing-default 1000 '{}' \
    '{group:default id:"95de8cfe-e658-4b15-9b02-2e8ab3d0465e" \
    params:{message: hellllooo}}'
{
    "id": "d13683c0-9dd0-11e9-b59b-e3b7da3ce825",
    "alertTypeId": ".always-firing-default",
    "interval": 1000,
    "actions": [
        {
            "group": "default",
            "params": {
                "message": "hellllooo"
            },
            "id": "95de8cfe-e658-4b15-9b02-2e8ab3d0465e"
        }
    ],
    "alertTypeParams": {},
    "scheduledTaskId": "X7qEuWsB5GskuWCOQHjY"
}
```

## creating a lot of alerts

Here's a bash script that creates a bunch of alerts, each printing a
different message:

```bash
#!/usr/bin/env bash

export ACTION_ID=95de8cfe-e658-4b15-9b02-2e8ab3d0465e

for i in {1..2}
do
	kbn-alert create .always-firing-default 1000 '{}' \
    	"{group:default id:\"${ACTION_ID}\" params:{message: \"hellllooo ${i}\"}}"
done
```

## deleting a lot of alerts

Use [`jq`](https://stedolan.github.io/jq/), install on mac with `brew`:

    brew install jq

Because the `kbn-a*` commands write JSON, `jq` is the tool of choice to cut
things up.

To get the ids of all the current alerts:

```console
$ kbn-alert ls | jq ".[ ] | .id"
"d13683c0-9dd0-11e9-b59b-e3b7da3ce825"
"f346cd20-9dd1-11e9-b59b-e3b7da3ce825"
"f46a1770-9dd1-11e9-b59b-e3b7da3ce825"
```

To delete them, sprinkle on some `xargs`:

```console
$ kbn-alert ls | jq ".[] | .id" | xargs -L 1 kbn-alert delete
{}
{}
{}
```