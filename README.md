# Lixpi-lists

Version:  0.0.2


To run the project:


Then you can run the whole application with the following command:

```shell
docker-compose --env-file .env.<stage-name> up
```

Debugging:

**TODO: specify the correct script:** To debug markdown stream parser run the:

```shell
docker exec -it lixpi-web-ui pnpm debug-markdown-stream-parser
```

# Build and run individual services

## Web UI

```shell
# remove all previous builds including dangling images and force re-build and run
# unix
./rebuild-containers.sh lixpi-web-ui

# Then run single service
docker-compose --env-file .env.<stage-name> up lixpi-web-ui

# Copy node_modules from the container to the host so that TypeScript types would be available to the IDE type checker
docker cp lixpi-web-ui:/usr/src/service/node_modules ./services/web-ui
```

## API

```shell
# remove all previous builds including dangling images and force re-build and run
# unix
./rebuild-containers.sh lixpi-api

# Then run single service
docker-compose --env-file .env.<stage-name> up lixpi-api

# Copy node_modules from the container to the host so that TypeScript types would be available to the IDE type checker
rm -Rf ./services/api/node_modules/@lixpi
docker cp lixpi-api:/usr/src/service/node_modules ./services/api

rm -Rf ./services/api/node_modules/@lixpi && mkdir ./services/api/node_modules/@lixpi
cp -r packages/lixpi/* ./services/api/node_modules/@lixpi
```

## SST

##### Build SST image (only if Dockerfile-SST has been changed)

```shell
# remove all previous builds including dangling images and force re-build and run
# unix
./rebuild-containers.sh lixpi-sst

# Then run single service
docker-compose --env-file .env.<stage-name> up lixpi-sst

# Copy node_modules from the container to the host so that TypeScript types would be available to the IDE type checker
docker cp lixpi-sst:/usr/src/service/node_modules ./
```

##### Run a single SST container:

```shell
# run existing containers, for daily usage when there hasn't been any changes to Dockerfile-SST
docker-compose --env-file .env.<stage-name> up lixpi-sst

# run production instance
FUCKING DOGSHIT !!! WHEN THE FUCK ARE YOU GOING TO DO THIS PROPERLY ?????
1. In docker-compose.yml replace
`- ./.env:/usr/src/service/.env` with `- ./.env.production:/usr/src/service/.env`
2. Run
docker-compose --env-file .env.production up lixpi-sst
2. Then run
`docker exec -it lixpi-sst pnpm run deploy`  make sure to use `run` command because it's that command conflicts with pnpm built in command https://github.com/pnpm/pnpm/issues/5163


docker-compose --env-file .env.development up lixpi-sst
```

##### Run SST commands

```shell
# authenticate AWS account
docker exec -it lixpi-sst pnpm aws-login

# start SST dev stack
docker exec -it lixpi-sst pnpm dev

# remove all SST stacks
docker exec -it lixpi-sst pnpm remove-stack

# remove single SST stack
docker exec -it lixpi-sst pnpm remove-stack <stack-name>
```

##### Or enter SST container

```shell
docker exec -it lixpi-sst /bin/sh
```

##### NATS

We use NATS as a main communication between clients, main api and all microservices.

To rebuild NATS container from scratch run:

```shell
./rebuild-containers.sh lixpi-nats-1 lixpi-nats-2 lixpi-nats-3
```

To run NATS cluster:
```shell
docker-compose --env-file .env.<stage-name> up lixpi-nats-1 lixpi-nats-2 lixpi-nats-3
```

To edit NATS cli connection
```shell
nats context edit syscontext
nats context edit regularcontex
```


##### Pulumi

We use Pulumi to manage our infrastructure code.

First you have to create twp *S3* buckets with the following names
 - `lixpi-pulumi-<your-name>-local`    // For local development
 - `lixpi-pulumi-<your-name>-dev`      // For dev deployments

To rebuild Pulumi container from scratch run:
```shell
./rebuild-containers.sh lixpi-pulumi
```

To run Pulumi:
```shell
docker-compose --env-file .env.<stage-name> up lixpi-pulumi
```


# Deploying to prod:

To build Web-ui

```shell
docker exec -it lixpi-web-ui pnpm build
```