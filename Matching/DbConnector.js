/*
 * Load depending modules
 */
var PG = require('pg');
var GEOJSON2WKT = require('../modules/Geojson2Wkt/Geojson2Wkt.js');

var DbConnector = (function () {
	/*
	 * Constructor
	 */
	var obj = function (config) {
		this.client = new PG.Client('postgres://' + config.user + ':' + config.pass + '@' + config.host + ':5432/' + config.name)
		this.client.connect();
	}

	/**
	 * Closes the connection and unsets client
	 */
	obj.prototype.close = function () {
		this.client.end();
		this.client = null;
	}

	/**
	 * Returns the next Reference Point 
	 */
	obj.prototype.getNextReferencePoint = function (excludes, callback) {
		this.client.query(
			'SELECT foursq_venues.id, foursq_venues.name, foursq_venues.address AS street, foursq_venues.city, foursq_venues.state, foursq_venues.country, ST_AsGeoJSON(the_geom) AS geom, foursq_categories.name AS category FROM foursq_venues LEFT JOIN foursq_venues_categories ON (foursq_venues.id = foursq_venues_categories.venue_id) LEFT JOIN foursq_categories ON (foursq_venues_categories.category_id = foursq_categories.id) ' + ((excludes.length > 0) ? 'WHERE foursq_venues.name IS NOT NULL AND foursq_venues.id NOT IN (\'' + excludes.join('\', \'') + '\') ' : '') + 'LIMIT 1;',
			// 'SELECT id, name, address AS street, category, ST_AsGeoJSON(the_geom) AS geom FROM foursq_venues ' + ((excludes.length > 0) ? 'WHERE name IS NOT NULL AND id NOT IN (\'' + excludes.join('\', \'') + '\') ' : '') + 'LIMIT 1',
			function (error, result) {
				if (error) throw new Error('Reading next reference point from foursquare venue table failed: \n' + JSON.stringify(error))
				else callback(result.rows[0]);
			}
		);
	}

	/**
	 * Returns {Array} of matching candidates in Facebook and OSM tables
	 */	

	 obj.prototype.getMatchingCandidates = function(matchingReference, callback) {
	 	var geometryWkt = GEOJSON2WKT.convert(matchingReference.geom);
	 	var matchingCandidates = {
	 		osm: [],
	 		facebook: []
	 	};
	 	var pending = 1;

	 	// TODO: Try to to put result handling into dedicated function
	 	// this.client.query(
	 	// 	'SELECT id, name, street, city, state, country, category, ST_AsGeoJSON(the_geom) AS geom FROM facebook WHERE ST_Intersects(the_geom, ST_Buffer(ST_Geomfromtext(\'' + geometryWkt + '\', 4326), 0.01))',
	 	// 	function (error, result) {
	 	// 		if (error) throw new Error('Error while reading facebook venues from database: \n' + JSON.stringify(error));
	 	// 		else matchingCandidates.facebook = result.rows;
	 	// 		pending--;
	 	// 		if (pending === 0) callback(matchingReference, matchingCandidates);
	 	// 	}
	 	// );

	 	this.client.query(
	 		'SELECT osm_id as id, name, "addr:street" AS street, ST_AsGeoJSON(ST_Transform(way, 4326)) AS geom FROM planet_osm_point WHERE amenity IS NOT NULL AND name IS NOT null AND ST_Intersects(ST_Transform(way, 4326), ST_Buffer(ST_Geomfromtext(\'' + geometryWkt + '\', 4326), 0.015))',
	 		function (error, result) {
	 			if (error) throw new Error('Error while reading osm pois from database: \n' + JSON.stringify(error));
	 			else matchingCandidates.osm = result.rows;
	 			pending--;
	 			if (pending === 0) callback(matchingReference, matchingCandidates);
	 		}
	 	);
	 }

	return obj;
})();


/*
 * Export the module
 */ 
module.exports = DbConnector;