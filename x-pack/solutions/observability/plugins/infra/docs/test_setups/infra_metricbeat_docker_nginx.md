# metricbeat / docker / nginx

This guide explains how to set up
* `docker` to run `nginx` serving a very simple web page
* `metricbeat` to report metrics from `docker` and `nginx`

This is helpful to test the following features in the Kibana Metrics UI:
* waffle map and list overview
* metrics detail page

This guide assumes:
* a linux environment, but mac os x should be very similar
* a running `elasticsearch` instance to send metrics data to

The information in this guide was valid on March 05 2019.

## Docker

First, get docker running. To do so, visit https://docs.docker.com/install/ and follow the instructions for your operating system. When you can run the `hello-world` container as described in https://docs.docker.com/get-started/, you're done.

## Create a docker image with nginx in it

Create a directory for your docker image:
```
$ mkdir nginx-docker-image
$ cd nginx-docker-image
```

Create a directory for content to be served by `nginx` and put a simple HTML document in it.
```
$ mkdir content
$ cat >> content/index.html <<HTML
<!doctype html>
<html>
  <head><title>Hello World!</title></head>
  <body><p>Hello World!</p></body>
</html>
HTML
```
Create a Dockerfile:
```
$ cat >>Dockerfile <<DOCKERFILE
FROM nginx
COPY content /usr/share/nginx/html
DOCKERFILE
```
Build the image:
```
$ docker build -t my-nginx-image .
```
Verify that the image has been created. Note that the command created two images, `my-nginx-image` and `nginx`. This is because the Dockerfile references the `nginx` image with `FROM nginx`.
```
$ docker images
REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE
my-nginx-image      latest              9fd43682f33e        4 seconds ago       109MB
nginx               latest              881bd08c0b08        7 hours ago         109MB
```
Start a docker container with the name `my-nginx-1` from that image, forwarding port `80` in the container to port `8081` on your local machine:
```
$ docker run --name my-nginx-1 -d -p 8081:80 my-nginx-image
```
Verify at http://localhost:8081 that the container is running and serves a web page.

Now do the same for a second container:
```
$ docker run --name my-nginx-2 -d -p 8082:80 my-nginx-image
```
Verify at http://localhost:8082. Do this for as many containers as you like, counting up the name suffix and the port for each.

To see a list of running containers, use:
```
$ docker ps
CONTAINER ID        IMAGE               COMMAND                  CREATED             STATUS              PORTS                  NAMES
4b0017cfd210        my-nginx-image      "nginx -g 'daemon of…"   2 minutes ago       Up 2 minutes        0.0.0.0:8082->80/tcp   my-nginx-2
29e1ca569a49        my-nginx-image      "nginx -g 'daemon of…"   2 minutes ago       Up 2 minutes        0.0.0.0:8081->80/tcp   my-nginx-1

```

## Metricbeat

One easy method to have several versions of `metricbeat` available on the same machine is to run them from archives, unpacked into separate directories.

Make a directory to keep all downloaded archives in:
```
$ mkdir tars
$ cd tars
```
Find the URL of the correct archive for the version and platform you want to test with.

For released versions you can find this link in the documentation, e.g. https://www.elastic.co/guide/en/beats/metricbeat/6.5/metricbeat-installation.html (which is used in this guide).

If you need a snapshot build for testing purposes, https://artifacts-api.elastic.co/v1/search/master/metricbeat gives a list of the latest builds. (If you arrived at this page NOT looking for test instructions, please be aware that these artifacts are UNSUPPORTED and should NOT be used in a production environment.)

If you need a specific build result, https://beats-ci.elastic.co/ has jobs which build packages. Their names end in `package`, and they have nested jobs with names ending in `multijob package PLATFORM`. Those then will contain a `Google Cloud Storage Upload Report`, and that contains links to the build artifact. A most likely outdated (!) example is https://beats-ci.elastic.co/job/elastic+beats+6.x+multijob-package-linux/gcsObjects/ , you will need to hunt down the one you need for your test yourself. (These build artifacts are even more UNSUPPORTED than the ones above and should NOT be used in a production environment either.)

Download the archive, unpack it and change into the unpacked directory:
```
$ curl -L -O https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-6.5.4-linux-x86_64.tar.gz
$ tar xzvf metricbeat-6.5.4-linux-x86_64.tar.gz
$ cd metricbeat-6.5.4-linux-x86_64
```
Edit `metricbeat.yml` and configure the correct `elasticsearch.output`, if necessary.

Change the ownership of some files to make `metricbeat` happy:
```
$ sudo chown root metricbeat.yml 
$ sudo chown root modules.d/system.yml
```

Enable the `docker` module of `metricbeat` with
```
$ sudo ./metricbeat modules enable docker
```
Enable docker metricsets in `modules.d/docker.yml` if necessary (i.e. make sure they're not commented out):
```
- module: docker
  metricsets:
    - container
    - cpu
    - diskio
    - healthcheck
    - info
    - memory
    - network
```
Fix one more file ownership:
```
$ sudo chown root modules.d/docker.yml
```
Out of the box, the docker module only reports basic system metrics from the running containers. To see metrics from `nginx` running in the containers, we need to enable autodiscover (https://www.elastic.co/guide/en/beats/metricbeat/6.5/configuration-autodiscover.html).

To do so, add the following lines at the end of `metricbeat.yml`:
```
metricbeat.autodiscover:
  providers:
    - type: docker
      templates:
        - condition:
            contains:
              docker.container.image: nginx
          config:
            - module: nginx
              metricsets: ["stubstatus"]
              hosts: "${data.host}:${data.port}"
```
This assumes that the name of the docker image you use indeed contains the string `nginx` (which it will if you followed this guide).

Now start `metricbeat` with:
```
$ sudo ./metricbeat -e
```
Watch the console output. At some point, a log line starting like this will appear, followed by the data sent to elasticsearch:
```
2019-03-05T13:40:38.194+0100    INFO    [monitoring]    log/log.go:144  Non-zero metrics in the last 30s {...}
```
If this data contains entries for `docker` and for `nginx`, the configuration is correct.

## Metrics UI

Now start Kibana and navigate to the Metrics UI. You should see your containers in the `Docker` tab, and `nginx` metrics on the node detail page for each container.

## Clean up

To stop `metricbeat`, hit `Ctrl-C` in the terminal in which it is running.

To see a list of running `docker` containers, use:
```
$ docker ps
```
To stop a running docker container, pick the container id from the list and use
```
$ docker stop CONTAINER_ID
```
To see a list of all containers, running or stopped, use
```
$ docker ps -a
```
To remove a container from your system, use
```
$ docker rm CONTAINER_ID
```
To see a list of all images you created, use
```
$ docker images
```
To remove an image, pick the image id from that list and use
```
$ docker rmi IMAGE_ID
```
## References

- https://docs.docker.com/install/
- https://docs.docker.com/get-started/
- https://docs.docker.com/samples/library/nginx/
- https://docs.docker.com/engine/reference/builder/#from
- https://www.elastic.co/guide/en/beats/metricbeat/6.5/metricbeat-installation.html
- https://artifacts-api.elastic.co/v1/search/master/metricbeat
- https://beats-ci.elastic.co/
- https://www.elastic.co/guide/en/beats/metricbeat/6.5/metricbeat-module-docker.html
- https://www.elastic.co/guide/en/beats/metricbeat/6.5/configuration-autodiscover.html
