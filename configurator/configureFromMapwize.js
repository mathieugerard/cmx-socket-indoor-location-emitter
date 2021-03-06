#!/usr/bin/env node

var program = require('commander');
var fs = require('fs');
var _ = require('lodash');
var request = require('request');
var async = require('async');

program
    .version('0.1.0')
    .description('Configure CMX Socket IndoorLocation Emitter using Mapwize data')
    .option('-c, --cmxConfig [config]', 'Path to CMX config file (output of maps API)')
    .option('-k, --mapwizeApiKey [key]', 'Mapwize api key')
    .option('-v, --mapwizeVenueId [venueId]', 'Mapwize venueId')
    .option('-o, --output [output]', 'Output file')
    .option('-p, --pretty', 'Format the JSON output to be pretty and readable')
    .parse(process.argv);

var nConfiguredFloors = 0;
var nNotConfiguredFloors = 0;
var nAccessPoints = 0;

if (!program.cmxConfig || !program.mapwizeApiKey || !program.mapwizeVenueId || !program.output) {
    console.log('The options --cmxConfig, --mapwizeApiKey, --mapwizeVenueId and --output are required.');
    return;
}

//Get Mapwize layers
var layersRequestOptions = {
    url: 'https://www.mapwize.io/api/v1/layers',
    method: 'GET',
    qs: {
        api_key: program.mapwizeApiKey,
        venueId: program.mapwizeVenueId
    },
    json: true
};
request(layersRequestOptions, function (error, response, body) {
    if (error) {
        console.log('Mapwize error:', error); // Print the error if one occurred
    }

    var mapwizeLayersByName = _.keyBy(body, 'name');

    var cmxConfig = JSON.parse(fs.readFileSync(program.cmxConfig, 'utf8'));

    var floors = [];

    _.forEach(cmxConfig.campuses, function(cmxCampus){

        _.forEach(cmxCampus.buildingList, function(cmxBuilding){

            _.forEach(cmxBuilding.floorList, function(cmxFloor){

                var mapwizeLayer = mapwizeLayersByName[cmxFloor.name];

                if (mapwizeLayer) {

                    var floor = {
                        floorId: cmxFloor.aesUid,
                        name: cmxFloor.name,
                        dimension: cmxFloor.dimension,
                        floor: mapwizeLayer.floor,
                        corners: mapwizeLayer.importJob.corners
                    };

                    floors.push(floor);

                    nConfiguredFloors = nConfiguredFloors + 1;

                } else {

                    console.log('No layer found on Mapwize for ' + cmxFloor.name);
                    nNotConfiguredFloors = nNotConfiguredFloors + 1;

                }

                if (cmxFloor.accessPoints) {
                    nAccessPoints = nAccessPoints + cmxFloor.accessPoints.length;
                }

            });

        });

    });

    if (program.output) {
        var floorsString;
        if (program.pretty) {
            floorsString = JSON.stringify(floors, null, 3);
        } else {
            floorsString = JSON.stringify(floors);
        }
        fs.writeFileSync(program.output, floorsString, 'utf8');
    } else {
        console.log('No output file defined.');
    }

    console.log(' ');
    console.log('Statistics');
    console.log('nConfiguredFloors ' + nConfiguredFloors);
    console.log('nNotConfiguredFloors ' + nNotConfiguredFloors);
    console.log('nAccessPoints ' + nAccessPoints);

});

