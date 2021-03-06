/* *****************************************************************************
 * CONSTANTS setup
 * ****************************************************************************/

// load dependencies
var DbConnection = require('./DbConnector.js');
var Matcher = require('./Matcher.js');
var FileWriter = require('./FileWriter.js');

// config
var processedRefPoints = [];

/* *****************************************************************************
 * SETUP PROCESSING
 * ****************************************************************************/

// parse the command line input 
var args = process.argv;
var argsObj = {};

var database, dbConfig;


// start index 2, since [0]=node, [1]=scriptpath
for (var i = 2;i < args.length; i++) {
	var argument = args[i];
	var nextArgument = args[i + 1];
	if (argument.indexOf('-') === 0) {
		argument = argument.replace(/^-+/,"");
		if (nextArgument && nextArgument.indexOf('-') !== 0) {
			argsObj[argument] = nextArgument;
			i++;
		} else {
			argsObj[argument] = true;	
		}
	}
}

// set database connection

var dbConfig = {
	user: argsObj.U,
	host: argsObj.h,
	name: argsObj.d
};

getPassword(handlePasswordInput);

/* *****************************************************************************
 * CONTROL FUNCTIONS
 * ****************************************************************************/

 /*
  *
  */
function getPassword(callback) {
 	var stdin = process.openStdin(),
    	tty = require('tty');

    process.stdout.write('Enter password for user ' + dbConfig.user + ' on database ' + dbConfig.name +': ');
	process.stdin.resume();
	process.stdin.setEncoding('utf8');
	process.stdin.setRawMode(true);
	password = ''
	process.stdin.on('data', function (char) {
    char = char + ""

    switch (char) {
    	case "\n": case "\r": case "\u0004":
			// They've finished typing their password
			process.stdin.setRawMode(false);
			console.log('\n\n');
			stdin.pause();
			callback(password);
			break;
    	case "\u0003":
    		// Ctrl C
			console.log('Cancelled');
			process.exit();
			break;
		default:
			// More passsword characters
			process.stdout.write('');
			password += char;
			break;
    }
  });
}

/**
 * Initialize process
 */
 function initializeProcess() {
 	database.getNextReferencePoint(processedRefPoints, handleNextRefPoint);
 }


/* *****************************************************************************
 * EVENT HANDLER
 * ****************************************************************************/

/*
 *
 */
function handlePasswordInput(password) {
 	dbConfig.pass = password;
 	database = new DbConnection(dbConfig);
 	initializeProcess();
}

function handleNextRefPoint(matchingReference) {
	database.getMatchingCandidates(matchingReference, handleMatchingCandidates);
}

var matchCount = 0;
function handleMatchingCandidates(matchingReference, matchingCandidates) {
	Matcher.match(matchingReference, matchingCandidates, handleMatchingResults);
}

function handleMatchingResults(match) {
	// matchTuples.forEach(function(tuple) {
	// 	if (tuple.jaroWinkler > 0.9) {console.log(tuple.refName + ', ' + tuple.candName + ' :: ' + tuple.jaroWinkler); }
	// });
	// 
	// 
	if (match.jaroWinkler > 0.9) {
		FileWriter.writeBatch('matches.csv', [match.reference + ',' + match.candidate]);
	}
	
	processedRefPoints.push(match.reference);
	database.getNextReferencePoint(processedRefPoints, handleNextRefPoint);
}