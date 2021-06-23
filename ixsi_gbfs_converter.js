const fs = require('fs')
const parser = require('fast-xml-parser');
const WebSocket = require('ws');

class IxsiGbfsConverter {
	constructor() {
		this.loadConfig()
		this.connect()
	}

	loadConfig() {
		try {
			const configString = fs.readFileSync("config.json");
			const config = JSON.parse(configString);
			this.ixsiEndpointUrl = config.ixsiEndpointUrl;
			this.ixsiSystemId = config.ixsiSystemId;
			this.requestSlotDurationSeconds = config.requestSlotDurationSeconds ? config.requestSlotDurationSeconds : 1800;
			this.requestIntervalSeconds = config.requestIntervalSeconds ? config.requestIntervalSeconds : 120;
		} catch (e) {
			console.warn("Can't load config.json")
		}
		
	}

	connect() {
		console.log("endpoint URL", this.ixsiEndpointUrl)
		this.connection = new WebSocket(this.ixsiEndpointUrl)

		this.connection.onerror = (error) => {
			console.warn(`WebSocket error: `, error);
			//try to reconnect, after 10 Seconds

			//stop old interval
			clearInterval(this.intervalReference);

			//restart connection after 10 seconds
			setTimeout(() => {this.connect()}, 10*1000);
		}

		this.connection.onmessage = (e) => {
			this.parseIXSI(e.data)
		}

		this.connection.onopen = () => {
			//start requests
			this.sendBookeeRequest()
			//sende requests all X seconds
			this.intervalReference = setInterval(()=>{
				this.sendBookeeRequest();
			}, this.requestIntervalSeconds*1000);
		}
	}

	/**
	 * parses IXSI XML to Object and uses Message ID to select right parser
	 **/
	parseIXSI(ixsiXML) {
		let ixsiObj = parser.parse(ixsiXML)
		let messageId = ixsiObj?.Ixsi?.Response?.Transaction?.MessageID
		switch (messageId) {
			case this.messageIdBookie:
				this.writeStationInformation(ixsiObj) //write station_information.json
				this.buildStationStatus(ixsiObj) //prepare station status and do availability request
				break;
			case this.messageIdAvailablility:
				this.writeStationStatus(ixsiObj) //parse availabilities and write station_status.json
				break;
			default:
				break;
		}
	}

	/**
	 * parse ixsi and write station_information.json
	 **/
	writeStationInformation(ixsiObj) {
		let places = ixsiObj?.Ixsi?.Response?.BaseData?.Place
		let gbfsStationInformation = {
			stations: []
		}
		if (places) {
			for (let place of places) {
				let name = place?.Name?.Text
				let station_id = place?.ID
				let lat = place?.GeoPosition?.Coord?.Latitude
				let lon = place?.GeoPosition?.Coord?.Longitude

				// only include if requiered fields are available
				if (name && station_id && lat && lon) {
					let station = {
						name: name,
						station_id: station_id,
						lat: lat,
						lon: lon
					}
					if (place?.Capacity) {
						station.capacity = place?.Capacity
					}
					gbfsStationInformation.stations.push(station)
				}
			}
		}
		let dataString = JSON.stringify(gbfsStationInformation, null, 4);
		fs.writeFileSync("./gbfs/station_information.json", dataString);
	}

	getResponseTimeStampFromIxsi(ixsiObj) {
		//let ixsiTimestamp = jsonObj?.Ixsi?.Response?.Transaction?.TimeStamp
		let ixsiTimestamp = ixsiObj?.Ixsi?.Response?.BaseData?.TimeStamp
		if (ixsiTimestamp) {
			let date = this.getGermanTimezonedDateFromString(ixsiTimestamp)
			let timestamp = date.getTime()/1000
			return timestamp;
		}
	}

	/**
	 * IXIS seems to use Local timestrings without declared timezone, so we convert them to timezoned UTC-Zone
	 **/
	getGermanTimezonedDateFromString(timeString) {
		//can't believe this is the supposed way to do this in Javascipt
		return new Date(new Date(timeString).toLocaleString('en-US', { timeZone: 'Europe/Berlin' }))
	}

	/**
	 * Builds base for station_status.json and requests availabilities
	 * */
	buildStationStatus(ixsiObj) {
		let places = ixsiObj?.Ixsi?.Response?.BaseData?.Place
		let bookees = ixsiObj?.Ixsi?.Response?.BaseData?.Bookee
		this.gbfsStationStatus = {
			stations: []
		}
//		let requestTimestamp = this.getResponseTimeStampFromIxsi(ixsiObj)
		if (places) {
			for (let place of places) {
				let station_id = place?.ID

				// only include if requiered fields are available
				if (station_id) {
					let station = {
						station_id: station_id,
						num_bikes_available: 0,
						is_installed: true,
						is_renting: true,
						is_returning: true,
//						last_reported: requestTimestamp //TODO - maybe that should be changed in the second request
					}

					if (place.Capacity){
						station.num_docks_available = place.Capacity
					}
					
					this.gbfsStationStatus.stations.push(station)
				}
			}
		}

		if (bookees) {
			let beginDate = new Date();
			let endDate = new Date();
			endDate.setSeconds(beginDate.getSeconds() + this.requestSlotDurationSeconds);
			let availabilityRequestXML = this.buildAvailabilityRequest(ixsiObj, beginDate, endDate);
			this.connection.send(availabilityRequestXML);
		}
	}

	buildAvailabilityRequest(ixsiObj, beginDate, endDate) {
		let places = ixsiObj?.Ixsi?.Response?.BaseData?.Place
		let bookees = ixsiObj?.Ixsi?.Response?.BaseData?.Bookee
		let xmlBookingTargets = []
		let beginDateString = beginDate.toISOString()
		let endDateString = endDate.toISOString()

		// begin use booking targets as selector - alternative could be radius

		for (let bookee of bookees) {
			let providerId = places.filter(p => (p.ID == bookee.PlaceID))[0]?.ProviderID
			let target = `
				<BookingTarget>
		  			<BookeeID>${bookee.ID}</BookeeID>
					<ProviderID>${providerId}</ProviderID>
				</BookingTarget>
			`
			xmlBookingTargets.push(target)
		}

		// end use booking targets as selector

		let requestPayload = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
			<Ixsi xmlns="http://www.ixsi-schnittstelle.de/">
			  <Request>
			    <Transaction>
			      <TimeStamp>${new Date().toISOString()}</TimeStamp>
			      <MessageID>${this.messageIdAvailablility}</MessageID>
			    </Transaction>
			    <SystemID>${this.ixsiSystemId}</SystemID>
			    <Auth>
			      <Anonymous>true</Anonymous>
			    </Auth>
			    <Availability>
			    	${xmlBookingTargets.join("")}
			    	<TimePeriod>
				    	<Begin>${beginDateString}</Begin>
				      <End>${endDateString}</End>
				    </TimePeriod>
			    </Availability>
			  </Request>
			</Ixsi>`
		return requestPayload
	}

	/**
	 * parses IXSI Availability and fills station_status with these availabilies
	 * */
	writeStationStatus(ixsiObj) {
		let bookingTargets = ixsiObj?.Ixsi?.Response?.Availability?.BookingTarget
		let requestTimestamp = this.getResponseTimeStampFromIxsi(ixsiObj)
		if (bookingTargets){
			for (let bookingTarget of bookingTargets) {
				let gbfsStation = this.gbfsStationStatus.stations.filter(p => p.station_id == bookingTarget.PlaceID)[0]
				if (!bookingTarget.Inavailability) {
					gbfsStation.num_bikes_available = gbfsStation.num_bikes_available + 1
					if (gbfsStation.num_docks_available) {
						gbfsStation.num_docks_available = gbfsStation.num_docks_available - 1
					}
				}
				gbfsStation.last_reported = requestTimestamp
			}
		} else {
			//TODO throw error / warning
		}

		let dataString = JSON.stringify(this.gbfsStationStatus, null, 4);
		fs.writeFileSync("./gbfs/station_status.json", dataString);
	}

	sendBookeeRequest() {
		let requestPayload = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
			<Ixsi xmlns="http://www.ixsi-schnittstelle.de/">
			  <Request>
			    <Transaction>
			      <TimeStamp>${new Date().toISOString()}</TimeStamp>
			      <MessageID>${this.messageIdBookie}</MessageID>
			    </Transaction>
			    <SystemID>${this.ixsiSystemId}</SystemID>
			    <BaseData>
			      <IncludeBookees>true</IncludeBookees>
			      <IncludeChargers>false</IncludeChargers>
			    </BaseData>
			  </Request>
			</Ixsi>`
		this.connection.send(requestPayload)
	}

	



	connection = null;
	intervalReference = null;

	gbfsStationStatus = null

	// ixsi message id
	messageIdBookie = 0
	messageIdAvailablility = 1

	// config properties
	ixsiEndpointUrl = null; // websocket connections string
	requestSlotDurationSeconds = 1800; //default 30 Minutes
	requestIntervalSeconds = 120; //deafult 2 minutes
	ixsiSystemId = null; //
}

//TODO: bei Place und Bookee kann auch nur ein Wert stehen, dann den noch ein eine Liste verwandeln

new IxsiGbfsConverter()