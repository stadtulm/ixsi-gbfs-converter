# IXSI GBFS Converter

This converter runs as a service requesting an [IXSI API endpoint](https://www.carsharing.de/themen/carsharing-schnittstelle/auskunftsschnittstelle-ixsi-50) and converts the data to [GBFS](https://github.com/NABSA/gbfs/).

Currently only supports station based systems. Currently exports as [GBFS version 2.0](https://github.com/NABSA/gbfs/blob/v2.0/gbfs.md).

## Config

Config is applied as enviroment variables.

* `IXSI_ENDPOINT_URL`: Websocket endpoint of the IXSI service. `wss://…`  
* `IXSI_SYSTEM_ID`: SystemID of IXSI which should be requested
* `REQUEST_SLOT_DURATION_SECONDS`: GBFS publishes only the current state of the system. But in most station based systems there is a minimal rent duration. This means that if a car is currenly available, but there is a booking in 15 minutes and the minimal booking slot ist 30 minutes, that in fact you cant rent the car right now. So this config can look `REQUEST_SLOT_DURATION_SECONDS` in advance. If there is an already booked slot in this timeframe, the car will be shown as unavailable in the GBFS output. Default: `1800` (30 minutes). Value in seconds.
* `REQUEST_INTERVAL_SECONDS`: How often the IXSI system will be requested for new data. Default: `120` (2 minutes). Value in seconds.
* `GBFS_LANGUAGE`: Language of GBFS files, currently only one language supported. Default: `de`.
* `GBFS_ENDPOINT`: Root URL on which the GBFS will be available (without `gbfs.json`, without trailing slash).
* `GBFS_SYSTEM_ID`: This is used as `system_id` in `system_information.json` file. Default: `ixsi-gbfs-converter`
* `GBFS_NAME`: Human readable name of the sharing system, used in `system_information.json`. Default: `GBFS Feed from IXSI`
* `GBFS_TIMEZONE`: This is used as `timezone` in `system_information.json`, see https://www.iana.org/time-zones. Default: `Europe/Berlin`
* `HTTP_SERVER_PORT`: Port the gbfs is served on

## Usage

The container connects to the IXSI websocket endpoint and places the resulting GBFS into the `gbfs` folder, that will be created if it doesn't exist.

### Docker

The Converter is also published as docker image as [stadtulm/ixsi-gbfs-converter](https://hub.docker.com/r/stadtulm/ixsi-gbfs-converter) on docker hub. Configuration also happens with environment variables. If you run the container with docker directly (and not by an orchestrator like k8s), have a look into the [--env-file](https://docs.docker.com/engine/reference/commandline/run/#set-environment-variables--e---env---env-file) flag, to collect all of them in a file.

### Local

Locally there is not only the way of configuring by environment variables, but thanks to [dotenv](https://www.npmjs.com/package/dotenv) you can also place them into a `.env` file. 

To install and run:

```
npm install
npm start
```
