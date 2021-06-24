# IXSI GBFS Converter

This converter runs as a service requesting an IXSI API endpoint and converts the data to [GBFS](https://github.com/NABSA/gbfs/).

Currently only supports station based systems. Currently exports as [GBFS version 2.0](https://github.com/NABSA/gbfs/blob/v2.0/gbfs.md).

## Config

Config is applied as enviroment variables.

* `ixsiEndpointUrl`: Websocket endpoint of the IXSI service. `wss://…`  
* `ixsiSystemId`: SystemID of IXSI which should be requested
* `requestSlotDurationSeconds`: GBFS publishes only the current state of the system. But in most station based systems there is a minimal rent duration. This means that if a car is currenly available, but there is a booking in 15 minutes and the minimal booking slot ist 30 minutes, that in fact you cant rent the car right now. So this config can look `requestSlotDurationSeconds` in advance. If there is an already booked slot in this timeframe, the car will be shown as unavailable in the GBFS output. Default: `1800` (30 minutes). Value in seconds.
* `requestIntervalSeconds`: How often the IXSI system will be requested for new data. Default: `120` (2 minutes). Value in seconds.
* `gbfsLanguage`: Language of GBFS files, currently only one language supported. Default: `de`.
* `gbfsEndpoint`: Root URL on which the GBFS will be available (without `gbfs.json`, without trailing slash).
* `gbfsSystemId`: This is used as `system_id` in `system_information.json` file. Default: `ixsi-gbfs-converter`
* `gbfsName`: Human readable name of the sharing system, used in `system_information.json`. Default: `GBFS Feed from IXSI`
* `gbfsTimezone`: This is used as `timezone` in `system_information.json`, see https://www.iana.org/time-zones. Default: `Europe/Berlin`
