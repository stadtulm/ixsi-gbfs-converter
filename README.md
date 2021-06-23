# IXSI GBFS Converter

This converter runs as a service requesting an IXSI API-Endpoint and converts the data to [GBFS](https://github.com/NABSA/gbfs/).

Currently only supports station Based systems. Currently exports in [GBFS-Version 2.0](https://github.com/NABSA/gbfs/blob/v2.0/gbfs.md).

## Config

Config is applyed as enviroment variables.

* `ixsiEndpointUrl`: Web-Socket Endpoint of the IXSI-Service. `wss://…`  
* `ixsiSystemId`: SystemID of IXSI which should be requested
* `requestSlotDurationSeconds`: GBFS publishes only the current state of the System. But in most station based systems there is a minimal rent duration. This means that if a car is currenly avaiable, but there is a booking in 15 Minutes and the minimal booking slot ist 30 Minutes, that in fact you cant rent he car right now. So this convert can look `requestSlotDurationSeconds` in advance. If there is allready booked slot in this timeframe the car will be shown as inavailble in the GBFS output. default: `1800` (30 Minutes). Value in Seconds.
* `requestIntervalSeconds`: How ofter the IXSI-System will be requested for new data. Default: `120` (2 Minutes). Value in Seconds.
* `gbfsLanguage`: language of GBFS files, currently only one language supported, default `de`
* `gbfsEndpoint`: Root-URL on which the GBFS will be available (without `gbfs.json`, without tailing slash).
* `gbfsSystemId`: this is used as `system_id` in `system_information.json` file. Deafult: `ixsi-gbfs-converter`
* `gbfsName`: Human readable Name of the sharing system, used in `system_information.json`. Default: `GBFS Feed from IXSI`
* `gbfsTimezone`: this is used as `timezone` in `system_information.json` https://www.iana.org/time-zones, default `Europe/Berlin`
